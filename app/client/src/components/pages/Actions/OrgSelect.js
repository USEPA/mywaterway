// @flow

import React from 'react';
import styled from 'styled-components';
import { Link, navigate } from '@reach/router';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// config
import { attains } from 'config/webServiceConfig';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
// errors
import { actionsError, noActionsAvailable } from 'config/errorMessages';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;
`;

const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
  text-align: center;
`;

// --- components ---
type Props = {
  ...RouteProps,
  actionId: string,
};

function OrgSelect({ actionId, ...props }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [noActions, setNoActions] = React.useState(false);
  const [orgActions, setOrgActions] = React.useState([]);

  // fetch action data from the attains 'actions' web service
  React.useEffect(
    () => {
      const url = attains.serviceUrl + `actions?ActionIdentifier=${actionId}`;

      fetchCheck(url)
        .then((res) => {
          // no actions, display error message
          if (res.items.length < 1) {
            setLoading(false);
            setNoActions(true);
            return;
          }

          // only 1 action reroute to actual actions page
          if (res.items.length === 1) {
            const orgId = res.items[0].organizationIdentifier;
            navigate(`/plan-summary/${orgId}/${actionId}`);
            return;
          }

          // multiple actions, give user the ability to choose from a list.
          if (res.items.length > 1) {
            setOrgActions(res.items);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
          setError(true);
        });
    },
    [actionId],
  );

  if (error) {
    return (
      <Page>
        <NavBar title="Plan Summary" />
        <ErrorBox>
          <p>{actionsError}</p>
        </ErrorBox>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <NavBar title="Plan Summary" />
        <LoadingSpinner />
      </Page>
    );
  }

  if (noActions) {
    return (
      <Page>
        <NavBar title={<>Plan Summary</>} />

        <Container>
          <ErrorBox>
            <p>{noActionsAvailable(actionId)}</p>
          </ErrorBox>
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <NavBar title="Select a Plan" />

      <Container className="container">
        <p>
          There are multiple organizations associated with the plan id:{' '}
          <strong>{actionId}</strong>. Please select one of the plans from the
          list below.
        </p>

        <br />

        <table className="table">
          <thead>
            <tr>
              <th>Organization Name (ID)</th>
              <th>Plan Name (ID)</th>
              <th>Plan Details</th>
            </tr>
          </thead>
          <tbody>
            {orgActions.map((org, index) => {
              const action = org.actions[0];

              // get the ids
              const orgId = org.organizationIdentifier;
              const actionId = action.actionIdentifier;

              return (
                <tr key={index}>
                  <td>
                    {org.organizationName} ({orgId})
                  </td>
                  <td>
                    {action.actionName} ({actionId})
                  </td>
                  <td>
                    <Link to={`/plan-summary/${orgId}/${actionId}`}>
                      Open Plan Summary
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Container>
    </Page>
  );
}

export default OrgSelect;
