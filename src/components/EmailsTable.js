import { Delete } from "@mui/icons-material";
import { IconButton, CircularProgress } from "@mui/material";
import { gql, useLazyQuery, useMutation, useSubscription } from "@apollo/client";
import { useUserData } from "@nhost/react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const GET_EMAILS = gql`
  query getEmails($user: uuid!) {
    emails(order_by: { created_at: desc }, where: { user_id: { _eq: $user } }) {
      created_at
      description
      email
      id
      img_text
      seen
      seen_at
    }
  }
`;

const DELETE_EMAIL = gql`
  mutation DeleteEmail($id: Int!) {
    delete_emails(where: { id: { _eq: $id } }) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

const WATCH_EMAILS = gql`
  subscription OnEmailUpdate($user_id: uuid!) {
    emails(where: { user_id: { _eq: $user_id } }) {
      id
      seen
      seen_at
    }
  }
`;

const EmailsTable = ({ styles }) => {
  const user = useUserData();
  const [emails, setEmails] = useState([]);

  const [getEmails, { loading }] = useLazyQuery(GET_EMAILS);

  const [deleteTodo, { loading: deleting }] = useMutation(DELETE_EMAIL);

  useEffect(() => {
    if (user?.id) {
      getEmails({
        variables: { user: user.id },
        onCompleted: (data) => {
          console.log('Emails data:', data);
          if (data?.emails) {
            setEmails(data.emails);
          }
        },
        onError: (error) => {
          console.error('Failed to fetch emails:', error);
          toast.error("Failed to load emails");
        },
        fetchPolicy: 'network-only'
      });
    }
  }, [user?.id, getEmails]);

  useSubscription(WATCH_EMAILS, {
    variables: { user_id: user?.id },
    skip: !user?.id,
    onData: ({ data }) => {
      if (data?.data?.emails) {
        setEmails(prevEmails => {
          return prevEmails.map(email => {
            const update = data.data.emails.find(e => e.id === email.id);
            return update ? { ...email, ...update } : email;
          });
        });
      }
    }
  });

  const deleteEmail = async (id) => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this?"
    );
    if (!confirmation) {
      return;
    }

    try {
      const { data } = await deleteTodo({
        variables: { id }
      });

      if (data?.delete_emails?.affected_rows > 0) {
        toast.success("Email deleted successfully");
        getEmails({
          variables: { user: user.id }
        });
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error("Unable to delete email");
    }
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <CircularProgress />
      </div>
    );
  }

  if (emails.length === 0) {
    return <div className={styles.loader}>No emails found</div>;
  }

  return (
    <div className={styles.contentDiv1}>
      <div className={styles.columnDiv}>
        <div className={styles.tableHeaderCell}>
          <div className={styles.tableHeaderDiv}>
            <div className={styles.textDiv1}>Email</div>
          </div>
        </div>
        {emails.map((email) => (
          <div className={styles.tableCellDiv} key={email.id}>
            <div className={styles.supportingTextDiv1}>{email.email}</div>
          </div>
        ))}
      </div>
      <div className={styles.columnDiv1}>
        <div className={styles.tableHeaderCell1}>
          <div className={styles.tableHeaderDiv1}>
            <div className={styles.textDiv1}>Status</div>
          </div>
        </div>
        {emails.map(({ seen, seen_at, id }) => (
          <div className={styles.tableCellDiv} key={id}>
            <div className={styles.badgeDiv}>
              <div className={styles.badgeBaseDiv}>
                <div className={seen ? styles.textDiv : styles.textDiv1}>
                  {seen_at ? 'Seen' : 'Unseen'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.columnDiv2}>
        <div className={styles.tableHeaderCell}>
          <div className={styles.tableHeaderDiv1}>
            <div className={styles.textDiv1}>Description</div>
          </div>
        </div>
        {emails.map(({ description, id }) => (
          <div className={styles.tableCellDiv} key={id}>
            <div className={styles.supportingTextDiv1}>{description}</div>
          </div>
        ))}
      </div>
      <div className={styles.columnDiv3}>
        <div className={styles.tableHeaderCell}>
          <div className={styles.tableHeaderDiv1}>
            <div className={styles.textDiv1}>Date sent</div>
          </div>
        </div>

        {emails.map(({ created_at, id }) => (
          <div className={styles.tableCellDiv} key={id}>
            <div className={styles.dateDiv}>
              {new Date(created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.columnDiv3}>
        <div className={styles.tableHeaderCell}>
          <div className={styles.tableHeaderDiv1}>
            <div className={styles.textDiv1}>Date seen</div>
          </div>
        </div>
        {emails.map(({ seen_at, id, seen }) => (
          <div className={styles.tableCellDiv} key={id}>
            <div className={styles.dateDiv}>
              {seen ? new Date(seen_at).toLocaleString() : "Not seen"}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.dropdownDiv}>
        <div className={styles.tableHeaderCell8} />
        {emails.map(({ id }) => (
          <div className={styles.tableCellButton} key={id}>
            <IconButton onClick={() => deleteEmail(id)}>
              <Delete />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailsTable;
