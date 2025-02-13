import gql from 'graphql-tag';

export const SignInMutation = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
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
      token
    }
  }
`;