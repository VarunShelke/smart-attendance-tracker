import * as cdk from 'aws-cdk-lib';
import {Stack, Tags} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';


export class SmartAttendanceTrackerStack extends Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly amplifyApp: amplify.CfnApp;
    public readonly studentImagesBucket: s3.Bucket;
    public readonly registerStudentFaceLambda: lambda.Function;
    public readonly registerStudentFaceLambdaLogGroup: logs.LogGroup;
    public readonly api: apigatewayv2.HttpApi;
    public readonly apiLogGroup: logs.LogGroup;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        Tags.of(this).add('Project', 'smart-attendance-tracker');
        Tags.of(this).add('ManagedBy', 'cdk');
        Tags.of(this).add('Owner', 'vps27');

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
            customAttributes: {
                faceRegistered: new cognito.StringAttribute({
                    minLen: 4,
                    maxLen: 5,
                    mutable: true,
                }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: false,
                otp: true,
            },
        });

        // Create an S3 bucket for storing face registration images
        this.studentImagesBucket = new s3.Bucket(this, 'StudentImagesBucket', {
            versioned: false,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

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
                callbackUrls: ['http://localhost:4173'],
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
        });

        // CloudWatch Log Group for API Gateway access logs
        this.apiLogGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
            logGroupName: '/aws/apigateway/smart-attendance',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create HTTP API Gateway
        this.api = new apigatewayv2.HttpApi(this, 'FaceRegistrationApi', {
            apiName: 'smart-attendance-api',
            description: 'API for face registration and attendance tracking',
            corsPreflight: {
                allowOrigins: [
                    'http://localhost:5173',
                ],
                allowMethods: [apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS],
                allowHeaders: ['Content-Type', 'Authorization'],
                allowCredentials: true,
                maxAge: cdk.Duration.hours(1),
            },
        });

        this.amplifyApp = new amplify.CfnApp(this, 'SmartAttendanceFrontend', {
            name: 'smart-attendance-tracker',
            platform: 'WEB_COMPUTE',
            environmentVariables: [
                {
                    name: 'VITE_AWS_USER_POOL_ID',
                    value: this.userPool.userPoolId,
                },
                {
                    name: 'VITE_AWS_USER_POOL_CLIENT_ID',
                    value: this.userPoolClient.userPoolClientId,
                },
                {
                    name: 'VITE_AWS_REGION',
                    value: this.region,
                },
                {
                    name: 'VITE_API_ENDPOINT',
                    value: this.api.apiEndpoint,
                }
            ],
            customRules: [
                {
                    source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
                    target: '/index.html',
                    status: '200',
                },
            ],
        });

        new amplify.CfnBranch(this, 'MainBranch', {
            appId: this.amplifyApp.attrAppId,
            branchName: 'main',
            stage: 'PRODUCTION',
        });

        this.registerStudentFaceLambdaLogGroup = new logs.LogGroup(this, 'RegisterStudentFaceLogGroup', {
            logGroupName: '/aws/lambda/register-student-face',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.registerStudentFaceLambda = new lambda.Function(this, 'RegisterStudentFaceFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'register_student_face.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda'),
            functionName: 'register-student-face',
            timeout: cdk.Duration.seconds(29),
            memorySize: 512,
            logGroup: this.registerStudentFaceLambdaLogGroup,
            environment: {
                S3_BUCKET_NAME: this.studentImagesBucket.bucketName,
                USER_POOL_ID: this.userPool.userPoolId,
                API_VERSION: 'v1',
            },
        });

        // Grant Lambda permissions to write to S3
        this.studentImagesBucket.grantWrite(this.registerStudentFaceLambda, 'face_registrations/*');

        // Create Cognito User Pool Authorizer
        const authorizer = new apigatewayv2_authorizers.HttpUserPoolAuthorizer(
            'CognitoAuthorizer',
            this.userPool,
            {
                userPoolClients: [this.userPoolClient],
                identitySource: ['$request.header.Authorization'],
            }
        );

        const registerFaceIntegration = new apigatewayv2_integrations.HttpLambdaIntegration(
            'RegisterFaceIntegration',
            this.registerStudentFaceLambda
        );

        this.api.addRoutes({
            path: '/api/v1/students/me/face',
            methods: [apigatewayv2.HttpMethod.POST],
            integration: registerFaceIntegration,
            authorizer: authorizer,
        });

        // Add throttling to default stage
        const defaultStage = this.api.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
        if (defaultStage) {
            defaultStage.defaultRouteSettings = {
                throttlingBurstLimit: 10,
                throttlingRateLimit: 1,
            };
        }

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

        new cdk.CfnOutput(this, 'StudentImagesBucketName', {
            value: this.studentImagesBucket.bucketName,
            description: 'S3 Bucket for Student Images',
            exportName: 'SmartAttendanceStudentImagesBucket',
        });

        new cdk.CfnOutput(this, 'StudentImagesBucketArn', {
            value: this.studentImagesBucket.bucketArn,
            description: 'S3 Bucket ARN for Student Images',
            exportName: 'SmartAttendanceStudentImagesBucketArn',
        });

        new cdk.CfnOutput(this, 'RegisterStudentFaceLambdaArn', {
            value: this.registerStudentFaceLambda.functionArn,
            description: 'Lambda ARN for Register Student Face',
            exportName: 'SmartAttendanceRegisterStudentFaceLambdaArn',
        });

        new cdk.CfnOutput(this, 'RegisterStudentFaceLambdaName', {
            value: this.registerStudentFaceLambda.functionName,
            description: 'Lambda Function Name for Register Student Face',
            exportName: 'SmartAttendanceRegisterStudentFaceLambdaName',
        });

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: this.api.apiEndpoint,
            description: 'API Gateway endpoint URL',
            exportName: 'SmartAttendanceApiEndpoint',
        });

        new cdk.CfnOutput(this, 'ApiId', {
            value: this.api.httpApiId,
            description: 'API Gateway ID',
            exportName: 'SmartAttendanceApiId',
        });
    }
}
