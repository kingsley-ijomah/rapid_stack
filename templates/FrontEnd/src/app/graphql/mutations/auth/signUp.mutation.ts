import gql from 'graphql-tag';

export const SignUpMutation = gql`
  mutation SignUp($fullName: String!, $email: String!, $password: String!, $passwordConfirmation: String!, $telephone: String!, $acceptTerms: Boolean!) {
    signUp(input: {
      fullName: $fullName,
      email: $email,
      password: $password,
      passwordConfirmation: $passwordConfirmation,
      telephone: $telephone,
      acceptTerms: $acceptTerms
    }) {
      data {
        id
        fullName
        email
        telephone
        acceptTerms
      }
      errors
      message
      httpStatus
    }
  }
`;