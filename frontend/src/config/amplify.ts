import {Amplify} from 'aws-amplify';

const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: import.meta.env.VITE_AWS_USER_POOL_ID,
            userPoolClientId: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID,
            region: import.meta.env.VITE_AWS_REGION,
            identityPoolId: import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
        }
    },
    Storage: {
        S3: {
            bucket: import.meta.env.VITE_AWS_S3_BUCKET,
            region: import.meta.env.VITE_AWS_S3_REGION,
        }
    }
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;
