import gql from 'graphql-tag';

export const CREATE_LOG = gql`
  mutation CreateLog($input: CreateLogInput!) {
    createLog(input: $input) {
      status
      message
    }
  }
`;