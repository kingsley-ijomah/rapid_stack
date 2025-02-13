import { gql } from '@apollo/client/core';

export const OtpRequestMutation = gql`
  mutation OtpRequest($email: String!) {
    otpRequest(input: { email: $email }) {
      data {
        id
        fullName
        email
        telephone
      }
      message
      errors
      httpStatus
    }
  }
`; 