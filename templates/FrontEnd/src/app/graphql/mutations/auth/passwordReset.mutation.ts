import { gql } from 'apollo-angular';

export const PasswordResetMutation = gql`
  mutation PasswordReset($otpCode: String!, $newPassword: String!, $confirmNewPassword: String!) {
    passwordReset(input: {
      otpCode: $otpCode,
      newPassword: $newPassword,
      confirmNewPassword: $confirmNewPassword
    }) {
      data {
        id
        fullName
        email
        telephone
      }
      errors
      message
      httpStatus
    }
  }
`;