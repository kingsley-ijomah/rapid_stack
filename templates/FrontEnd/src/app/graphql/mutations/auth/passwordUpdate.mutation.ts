import gql from 'graphql-tag';

export const PasswordUpdateMutation = gql`
  mutation UpdatePassword($input: UpdatePasswordInput!) {
    updatePassword(input: $input) {
      data {
        id
        fullName
        email
        telephone
        role
      }
      message
      errors
      httpStatus
    }
  }
`;