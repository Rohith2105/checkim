import { NhostClient } from "@nhost/nhost-js";
import dotenv from "dotenv";
dotenv.config();

// Configuration
const config = {
  adminSecret: process.env.NHOST_ADMIN_SECRET,
  backendUrl: process.env.NHOST_BACKEND_URL,
  errorMessages: {
    noTrackingId: "No tracking ID provided",
    emailNotFound: "Email not found",
    updateFailed: "Failed to update email",
    verificationFailed: "Update verification failed"
  }
};

// Initialize Nhost client
const nhost = new NhostClient({
  backendUrl: config.backendUrl,
});

nhost.graphql.setAccessToken(config.adminSecret);

// GraphQL Queries
const queries = {
  getEmail: `
    query getId($text: String!) {
      emails(where: {img_text: {_eq: $text}}) {
        id
        seen
        seen_at
      }
    }`,

  updateEmail: `
    mutation updateSeen($id: Int!, $date: timestamptz!) {
  update_emails(
    where: { id: { _eq: $id } }
    _set: { 
      seen: true,
      seen_at: $date
    }
  ) {
    affected_rows
  }
}`
};

// Helper functions
const logError = (message, error = null) => {
  console.error(message);
  if (error) console.error('Details:', error);
};

const logInfo = (message, data = null) => {
  console.log(message);
  if (data) console.log('Data:', data);
};

const createResponse = (status, body) => ({
  status,
  body: typeof body === 'string' ? { message: body } : body
});

// Main handler
const updateHandler = async (req, res) => {
  const imgText = req.query.text;
  logInfo(`Tracking request received for: ${imgText}`);

  if (!imgText) {
    return res.status(400).json(
      createResponse(400, config.errorMessages.noTrackingId)
    );
  }

  try {
    // Get email data
    const { data: emailData, error: queryError } = await nhost.graphql.request(
      queries.getEmail,
      { text: imgText }
    );

    if (queryError) throw new Error(queryError.message);

    const email = emailData?.emails?.[0];
    if (!email) {
      logError(`No email found with img_text: ${imgText}`);
      return res.status(404).json(
        createResponse(404, config.errorMessages.emailNotFound)
      );
    }

    logInfo('Found email:', email);

    // Update email status
    const timestamp = new Date().toISOString();
    const updateParams = {
      id: parseInt(email.id),
      date: timestamp
    };

    logInfo('Attempting update with:', updateParams);

    const { data: updateData, error: updateError } = await nhost.graphql.request(
      queries.updateEmail,
      updateParams
    );

    if (updateError) throw new Error(updateError.message);

    // Verify update
    const { data: verifyData } = await nhost.graphql.request(
      queries.getEmail,
      { text: imgText }
    );

    const updatedEmail = verifyData?.emails?.[0];
    logInfo('Verification result:', updatedEmail);

    if (!updatedEmail?.seen) {
      throw new Error(config.errorMessages.verificationFailed);
    }

    // Check if update was successful
    if (updateData?.update_emails?.affected_rows > 0) {
      return res.status(200).json(createResponse(200, {
        success: true,
        message: "Email tracked successfully",
        data: {
          id: updateParams.id,
          seen: true,
          seen_at: timestamp
        }
      }));
    }

    throw new Error(config.errorMessages.updateFailed);

  } catch (error) {
    logError('Handler error:', error);
    return res.status(500).json(createResponse(500, {
      error: "Update failed",
      details: error.message
    }));
  }
};

export default updateHandler;
