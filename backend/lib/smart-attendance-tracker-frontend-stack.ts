import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import {Construct} from 'constructs';

export class SmartAttendanceTrackerFrontendStack extends cdk.Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly amplifyApp: amplify.CfnApp;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // ===== Cognito User Pool =====
        this.userPool = new cognito.UserPool(this, 'SmartAttendanceUserPool', {
            userPoolName: 'smart-attendance-user-pool',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                givenName: {
                    required: true,
                    mutable: true,
                },
                familyName: {
                    required: true,
                    mutable: true,
                },
                profilePicture: {
                    required: false,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: false,
                otp: true,
            },
        });

        // ===== Cognito User Pool Client =====
        this.userPoolClient = new cognito.UserPoolClient(this, 'SmartAttendanceUserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: 'smart-attendance-web-client',
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: ['http://localhost:4173', 'http://localhost:4173/'],
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
        });

        // ===== AWS Amplify App =====
        this.amplifyApp = new amplify.CfnApp(this, 'SmartAttendanceFrontend', {
            name: 'smart-attendance-tracker',
            platform: 'WEB_COMPUTE',
            environmentVariables: [
                {
                    name: 'VITE_USER_POOL_ID',
                    value: this.userPool.userPoolId,
                },
                {
                    name: 'VITE_USER_POOL_CLIENT_ID',
                    value: this.userPoolClient.userPoolClientId,
                },
                {
                    name: 'VITE_AWS_REGION',
                    value: this.region,
                },
            ],
            customRules: [
                {
                    source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
                    target: '/index.html',
                    status: '200',
                },
            ],
        });

        // Create a branch for manual deployment
        new amplify.CfnBranch(this, 'MainBranch', {
            appId: this.amplifyApp.attrAppId,
            branchName: 'main',
            stage: 'PRODUCTION',
        });

        // ===== CloudFormation Outputs =====
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: 'SmartAttendanceUserPoolId',
        });

        new cdk.CfnOutput(this, 'UserPoolArn', {
            value: this.userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
            exportName: 'SmartAttendanceUserPoolArn',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: 'SmartAttendanceUserPoolClientId',
        });

        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: this.amplifyApp.attrAppId,
            description: 'Amplify App ID',
            exportName: 'SmartAttendanceAmplifyAppId',
        });

        new cdk.CfnOutput(this, 'AmplifyAppDefaultDomain', {
            value: this.amplifyApp.attrDefaultDomain,
            description: 'Amplify App Default Domain',
        });
    }
}
