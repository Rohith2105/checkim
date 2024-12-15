import styles from "../styles/pages/Dashboard.module.css";
import EmailsTable from "../components/EmailsTable";
import { Helmet } from "react-helmet";
import { useUserData } from "@nhost/react";
import { useQuery, gql } from "@apollo/client";

const GET_EMAIL_STATS = gql`
  query GetEmailStats($userId: uuid!) {
  emails_aggregate(where: { user_id: { _eq: $userId } }) {
    aggregate {
      count
    }
  }
  seen: emails_aggregate(where: { user_id: { _eq: $userId }, seen: { _eq: true } }) {
    aggregate {
      count
    }
  }
  unseen: emails_aggregate(where: { user_id: { _eq: $userId }, seen: { _eq: false } }) {
    aggregate {
      count
    }
  }
  emails(
    where: { user_id: { _eq: $userId }, seen: { _eq: true } }
    order_by: { seen_at: desc }
    limit: 5
  ) {
    email
    seen_at
  }
}

`;

const Overview = () => {
  const user = useUserData();
  const { data: statsData } = useQuery(GET_EMAIL_STATS, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  return (
    <>
      <Helmet>
        <title>Overview - Mailsbe</title>
      </Helmet>
      <div className={styles.tableDiv}>
        {statsData && (
          <div className={styles.statsContainer}>
            <div className={styles.statBox}>
              <h3>Total Emails</h3>
              <p>{statsData.emails_aggregate.aggregate.count}</p>
            </div>
            <div className={styles.statBox}>
              <h3>Seen</h3>
              <p>{statsData.seen.aggregate.count}</p>
            </div>
            <div className={styles.statBox}>
              <h3>Unseen</h3>
              <p>{statsData.unseen.aggregate.count}</p>
            </div>
          </div>
        )}
        <EmailsTable styles={styles} />
      </div>
    </>
  );
};

export default Overview;
