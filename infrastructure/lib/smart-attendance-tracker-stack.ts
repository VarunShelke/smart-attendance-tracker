import * as cdk from 'aws-cdk-lib';
import {Stack, Tags} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda_event_sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';


export class SmartAttendanceTrackerStack extends Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly amplifyApp: amplify.CfnApp;
    public readonly studentImagesBucket: s3.Bucket;
    public readonly studentsTable: dynamodb.Table;
    public readonly studentAttendanceTable: dynamodb.Table;
    public readonly classSchedulesTable: dynamodb.Table;
    public readonly universitiesTable: dynamodb.Table;
    public readonly studentCoursesTable: dynamodb.Table;
    public readonly faceComparisonQueue: sqs.Queue;
    public readonly faceComparisonDLQ: sqs.Queue;
    public readonly attendanceNotificationTopic: sns.Topic;
    public readonly sharedLambdaLayer: lambda.LayerVersion;
    public readonly registerStudentFaceLambda: lambda.Function;
    public readonly registerStudentFaceLambdaLogGroup: logs.LogGroup;
    public readonly createStudentProfileLambda: lambda.Function;
    public readonly createStudentProfileLambdaLogGroup: logs.LogGroup;
    public readonly getStudentProfileLambda: lambda.Function;
    public readonly getStudentProfileLambdaLogGroup: logs.LogGroup;
    public readonly updateStudentProfileLambda: lambda.Function;
    public readonly updateStudentProfileLambdaLogGroup: logs.LogGroup;
    public readonly getStudentCoursesLambda: lambda.Function;
    public readonly getStudentCoursesLambdaLogGroup: logs.LogGroup;
    public readonly processAttendanceLambda: lambda.Function;
    public readonly processAttendanceLambdaLogGroup: logs.LogGroup;
    public readonly compareStudentFaceLambda: lambda.Function;
    public readonly compareStudentFaceLambdaLogGroup: logs.LogGroup;
    public readonly getUniversityLambda: lambda.Function;
    public readonly getUniversityLambdaLogGroup: logs.LogGroup;
    public readonly listUniversitiesLambda: lambda.Function;
    public readonly listUniversitiesLambdaLogGroup: logs.LogGroup;
    public readonly upsertUniversityLambda: lambda.Function;
    public readonly upsertUniversityLambdaLogGroup: logs.LogGroup;
    public readonly getScheduleLambda: lambda.Function;
    public readonly getScheduleLambdaLogGroup: logs.LogGroup;
    public readonly upsertScheduleLambda: lambda.Function;
    public readonly upsertScheduleLambdaLogGroup: logs.LogGroup;
    public readonly listStudentsLambda: lambda.Function;
    public readonly listStudentsLambdaLogGroup: logs.LogGroup;
    public readonly getStudentEnrollmentsLambda: lambda.Function;
    public readonly getStudentEnrollmentsLambdaLogGroup: logs.LogGroup;
    public readonly enrollStudentLambda: lambda.Function;
    public readonly enrollStudentLambdaLogGroup: logs.LogGroup;
    public readonly listSchedulesLambda: lambda.Function;
    public readonly listSchedulesLambdaLogGroup: logs.LogGroup;
    public readonly api: apigateway.RestApi;
    public readonly apiLogGroup: logs.LogGroup;
    public readonly usagePlan: apigateway.UsagePlan;
    public readonly apiKey: apigateway.ApiKey;

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

        // Create Cognito User Pool Groups for role-based access control
        const adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Admin',
            description: 'Administrators with full system access',
            precedence: 0,
        });

        const instructorGroup = new cognito.CfnUserPoolGroup(this, 'InstructorGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Instructor',
            description: 'Instructors who manage courses',
            precedence: 10,
        });

        const studentGroup = new cognito.CfnUserPoolGroup(this, 'StudentGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Student',
            description: 'Students who mark attendance',
            precedence: 20,
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

        this.studentsTable = new dynamodb.Table(this, 'AttendanceTrackerStudentsTable', {
            tableName: 'attendance-tracker-students',
            partitionKey: {
                name: 'user_id',
                type: dynamodb.AttributeType.STRING,
            },
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
                recoveryPeriodInDays: 30
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
        });

        this.studentsTable.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: {name: 'email', type: dynamodb.AttributeType.STRING},
            sortKey: {name: 'created_at', type: dynamodb.AttributeType.STRING},
        });

        // Create a StudentAttendance DynamoDB table for storing attendance records
        this.studentAttendanceTable = new dynamodb.Table(this, 'StudentAttendanceTable', {
            tableName: 'attendance-tracker-student-attendance',
            partitionKey: {
                name: 'user_id',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'attendance_date',
                type: dynamodb.AttributeType.STRING,
            },
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
                recoveryPeriodInDays: 30
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
        });

        // Add GSI for attendance_id lookups
        this.studentAttendanceTable.addGlobalSecondaryIndex({
            indexName: 'attendance-id-index',
            partitionKey: {name: 'attendance_id', type: dynamodb.AttributeType.STRING},
        });

        // Create ClassSchedules DynamoDB table for storing course schedules
        this.classSchedulesTable = new dynamodb.Table(this, 'ClassSchedulesTable', {
            tableName: 'attendance-tracker-class-schedules',
            partitionKey: {
                name: 'schedule_id',
                type: dynamodb.AttributeType.STRING,
            },
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
                recoveryPeriodInDays: 30
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
        });

        // Create Universities DynamoDB table for storing university information
        this.universitiesTable = new dynamodb.Table(this, 'UniversitiesTable', {
            tableName: 'attendance-tracker-universities',
            partitionKey: {
                name: 'university_id',
                type: dynamodb.AttributeType.STRING,
            },
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
                recoveryPeriodInDays: 30
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
        });

        // Add GSI for university_code lookups
        this.universitiesTable.addGlobalSecondaryIndex({
            indexName: 'university-code-index',
            partitionKey: {name: 'university_code', type: dynamodb.AttributeType.STRING},
        });

        // Create StudentCourses DynamoDB table for storing student course enrollments
        this.studentCoursesTable = new dynamodb.Table(this, 'StudentCoursesTable', {
            tableName: 'attendance-tracker-student-courses',
            partitionKey: {
                name: 'user_id',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'course_id',
                type: dynamodb.AttributeType.STRING,
            },
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: true,
                recoveryPeriodInDays: 30
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false,
        });

        // Add GSI for schedule_id lookups
        this.studentCoursesTable.addGlobalSecondaryIndex({
            indexName: 'schedule-id-index',
            partitionKey: {name: 'schedule_id', type: dynamodb.AttributeType.STRING},
        });

        // Create Dead Letter Queue for failed face comparisons
        this.faceComparisonDLQ = new sqs.Queue(this, 'FaceComparisonDLQ', {
            queueName: 'face-comparison-dlq',
            retentionPeriod: cdk.Duration.days(14),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create SQS Queue for face comparison processing
        this.faceComparisonQueue = new sqs.Queue(this, 'FaceComparisonQueue', {
            queueName: 'face-comparison-queue',
            visibilityTimeout: cdk.Duration.seconds(45),
            retentionPeriod: cdk.Duration.days(4),
            receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
            deadLetterQueue: {
                queue: this.faceComparisonDLQ,
                maxReceiveCount: 3,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // Create SNS Topic for attendance notifications
        this.attendanceNotificationTopic = new sns.Topic(this, 'AttendanceNotificationTopic', {
            topicName: 'attendance-notifications',
            displayName: 'Pitt Attendance Notifications',
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
                callbackUrls: ['http://localhost:4173', 'http://localhost:5173'],
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

        // Create REST API Gateway
        this.api = new apigateway.RestApi(this, 'SmartAttendanceAPI', {
            restApiName: 'smart-attendance-api',
            description: 'API for face registration and attendance tracking',
            deployOptions: {
                stageName: 'api',
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true,
                accessLogDestination: new apigateway.LogGroupLogDestination(this.apiLogGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    caller: true,
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    user: true,
                }),
            },
            defaultCorsPreflightOptions: {
                allowOrigins: [
                    'http://localhost:5173', 'http://localhost:4173'
                ],
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
                allowCredentials: true,
                maxAge: cdk.Duration.hours(1),
            },
            cloudWatchRole: true,
            apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
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
                    value: this.api.url,
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

        this.sharedLambdaLayer = new lambda.LayerVersion(this, 'SharedLambdaLayer', {
            layerVersionName: 'smart-attendance-shared-layer',
            code: lambda.Code.fromAsset('../backend/src/lambda', {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_13.bundlingImage,
                    platform: 'linux/arm64',
                    command: [
                        'bash', '-c',
                        [
                            'mkdir -p /asset-output/python',
                            'mkdir -p /asset-output/python/student',
                            'mkdir -p /asset-output/python/attendance',
                            'mkdir -p /asset-output/python/university',
                            'mkdir -p /asset-output/python/schedule',
                            'cp -r /asset-input/utils /asset-output/python/',
                            'cp -r /asset-input/constants /asset-output/python/',
                            'cp -r /asset-input/student/shared /asset-output/python/student/',
                            'cp -r /asset-input/attendance/shared /asset-output/python/attendance/',
                            'cp -r /asset-input/university/shared /asset-output/python/university/',
                            'cp -r /asset-input/schedule/shared /asset-output/python/schedule/',
                            'pip install -r /asset-input/requirements.txt -t /asset-output/python --upgrade',
                        ].join(' && ')
                    ],
                },
            }),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
            compatibleArchitectures: [lambda.Architecture.ARM_64],
            description: 'Shared utilities, constants, and models for Lambda functions',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.createStudentProfileLambdaLogGroup = new logs.LogGroup(this, 'CreateStudentProfileLogGroup', {
            logGroupName: '/aws/lambda/create-student-profile',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.createStudentProfileLambda = new lambda.Function(this, 'CreateStudentProfileFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'create_student_profile.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/profile'),
            functionName: 'create-student-profile',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            logGroup: this.createStudentProfileLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
                SNS_TOPIC_ARN: this.attendanceNotificationTopic.topicArn,
            },
        });

        this.studentsTable.grantWriteData(this.createStudentProfileLambda);

        // Grant SNS permissions to create_student_profile Lambda
        this.attendanceNotificationTopic.grantPublish(this.createStudentProfileLambda);

        // Grant SNS subscribe permission to create_student_profile Lambda
        this.createStudentProfileLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['sns:Subscribe'],
            resources: [this.attendanceNotificationTopic.topicArn],
        }));

        // Grant Cognito permissions to create_student_profile Lambda for group assignment
        // Note: Using wildcard to avoid circular dependency with UserPool trigger
        this.createStudentProfileLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cognito-idp:AdminAddUserToGroup'],
            resources: ['*'],
        }));

        this.userPool.addTrigger(
            cognito.UserPoolOperation.POST_CONFIRMATION,
            this.createStudentProfileLambda
        );

        this.getStudentProfileLambdaLogGroup = new logs.LogGroup(this, 'GetStudentProfileLogGroup', {
            logGroupName: '/aws/lambda/get-student-profile',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.getStudentProfileLambda = new lambda.Function(this, 'GetStudentProfileFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'get_student_profile.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/profile'),
            functionName: 'get-student-profile',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.getStudentProfileLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
            },
        });

        this.studentsTable.grantReadData(this.getStudentProfileLambda);

        this.updateStudentProfileLambdaLogGroup = new logs.LogGroup(this, 'UpdateStudentProfileLogGroup', {
            logGroupName: '/aws/lambda/update-student-profile',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.updateStudentProfileLambda = new lambda.Function(this, 'UpdateStudentProfileFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'update_student_profile.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/profile'),
            functionName: 'update-student-profile',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.updateStudentProfileLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
            },
        });

        this.studentsTable.grantReadWriteData(this.updateStudentProfileLambda);

        this.getStudentCoursesLambdaLogGroup = new logs.LogGroup(this, 'GetStudentCoursesLogGroup', {
            logGroupName: '/aws/lambda/get-student-courses',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.getStudentCoursesLambda = new lambda.Function(this, 'GetStudentCoursesFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'get_student_courses.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/courses'),
            functionName: 'get-student-courses',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.getStudentCoursesLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENT_COURSES_TABLE_NAME: this.studentCoursesTable.tableName,
            },
        });

        this.studentCoursesTable.grantReadData(this.getStudentCoursesLambda);

        // University Lambda Functions
        this.getUniversityLambdaLogGroup = new logs.LogGroup(this, 'GetUniversityLogGroup', {
            logGroupName: '/aws/lambda/get-university',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.getUniversityLambda = new lambda.Function(this, 'GetUniversityFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'get_university.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/university'),
            functionName: 'get-university',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.getUniversityLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                UNIVERSITIES_TABLE_NAME: this.universitiesTable.tableName,
            },
        });

        this.universitiesTable.grantReadData(this.getUniversityLambda);

        this.listUniversitiesLambdaLogGroup = new logs.LogGroup(this, 'ListUniversitiesLogGroup', {
            logGroupName: '/aws/lambda/list-universities',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.listUniversitiesLambda = new lambda.Function(this, 'ListUniversitiesFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'list_universities.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/university'),
            functionName: 'list-universities',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.listUniversitiesLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                UNIVERSITIES_TABLE_NAME: this.universitiesTable.tableName,
            },
        });

        this.universitiesTable.grantReadData(this.listUniversitiesLambda);

        this.upsertUniversityLambdaLogGroup = new logs.LogGroup(this, 'UpsertUniversityLogGroup', {
            logGroupName: '/aws/lambda/upsert-university',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.upsertUniversityLambda = new lambda.Function(this, 'UpsertUniversityFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'upsert_university.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/university'),
            functionName: 'upsert-university',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.upsertUniversityLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                UNIVERSITIES_TABLE_NAME: this.universitiesTable.tableName,
            },
        });

        this.universitiesTable.grantReadWriteData(this.upsertUniversityLambda);

        // Schedule Lambda Functions
        this.getScheduleLambdaLogGroup = new logs.LogGroup(this, 'GetScheduleLogGroup', {
            logGroupName: '/aws/lambda/get-schedule',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.getScheduleLambda = new lambda.Function(this, 'GetScheduleFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'get_schedule.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/schedule'),
            functionName: 'get-schedule',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.getScheduleLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                CLASS_SCHEDULES_TABLE_NAME: this.classSchedulesTable.tableName,
            },
        });

        this.classSchedulesTable.grantReadData(this.getScheduleLambda);

        this.upsertScheduleLambdaLogGroup = new logs.LogGroup(this, 'UpsertScheduleLogGroup', {
            logGroupName: '/aws/lambda/upsert-schedule',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.upsertScheduleLambda = new lambda.Function(this, 'UpsertScheduleFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'upsert_schedule.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/schedule'),
            functionName: 'upsert-schedule',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.upsertScheduleLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                CLASS_SCHEDULES_TABLE_NAME: this.classSchedulesTable.tableName,
            },
        });

        this.classSchedulesTable.grantReadWriteData(this.upsertScheduleLambda);

        // Admin Student Management Lambda Functions
        this.listStudentsLambdaLogGroup = new logs.LogGroup(this, 'ListStudentsLogGroup', {
            logGroupName: '/aws/lambda/list-students',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.listStudentsLambda = new lambda.Function(this, 'ListStudentsFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'list_students.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student'),
            functionName: 'list-students',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.listStudentsLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
            },
        });

        this.studentsTable.grantReadData(this.listStudentsLambda);

        this.getStudentEnrollmentsLambdaLogGroup = new logs.LogGroup(this, 'GetStudentEnrollmentsLogGroup', {
            logGroupName: '/aws/lambda/get-student-enrollments',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.getStudentEnrollmentsLambda = new lambda.Function(this, 'GetStudentEnrollmentsFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'get_student_enrollments.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/courses'),
            functionName: 'get-student-enrollments',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.getStudentEnrollmentsLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENT_COURSES_TABLE_NAME: this.studentCoursesTable.tableName,
            },
        });

        this.studentCoursesTable.grantReadData(this.getStudentEnrollmentsLambda);

        this.enrollStudentLambdaLogGroup = new logs.LogGroup(this, 'EnrollStudentLogGroup', {
            logGroupName: '/aws/lambda/enroll-student',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.enrollStudentLambda = new lambda.Function(this, 'EnrollStudentFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'enroll_student.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/student/courses'),
            functionName: 'enroll-student',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.enrollStudentLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                STUDENT_COURSES_TABLE_NAME: this.studentCoursesTable.tableName,
                CLASS_SCHEDULES_TABLE_NAME: this.classSchedulesTable.tableName,
            },
        });

        this.studentCoursesTable.grantWriteData(this.enrollStudentLambda);
        this.classSchedulesTable.grantReadData(this.enrollStudentLambda);

        this.listSchedulesLambdaLogGroup = new logs.LogGroup(this, 'ListSchedulesLogGroup', {
            logGroupName: '/aws/lambda/list-schedules',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.listSchedulesLambda = new lambda.Function(this, 'ListSchedulesFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'list_schedules.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/schedule'),
            functionName: 'list-schedules',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            logGroup: this.listSchedulesLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                CLASS_SCHEDULES_TABLE_NAME: this.classSchedulesTable.tableName,
            },
        });

        this.classSchedulesTable.grantReadData(this.listSchedulesLambda);

        this.registerStudentFaceLambdaLogGroup = new logs.LogGroup(this, 'RegisterStudentFaceLogGroup', {
            logGroupName: '/aws/lambda/register-student-face',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.registerStudentFaceLambda = new lambda.Function(this, 'RegisterStudentFaceFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'register_student_face.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/attendance'),
            functionName: 'register-student-face',
            timeout: cdk.Duration.seconds(29),
            memorySize: 512,
            logGroup: this.registerStudentFaceLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                S3_BUCKET_NAME: this.studentImagesBucket.bucketName,
                USER_POOL_ID: this.userPool.userPoolId,
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
                API_VERSION: 'v1',
            },
        });

        // Grant Lambda permissions to write to S3
        this.studentImagesBucket.grantWrite(this.registerStudentFaceLambda, 'face_registrations/*');

        // Grant Lambda permissions to update student records in DynamoDB
        this.studentsTable.grantWriteData(this.registerStudentFaceLambda);

        // Create process_attendance Lambda function
        this.processAttendanceLambdaLogGroup = new logs.LogGroup(this, 'ProcessAttendanceLogGroup', {
            logGroupName: '/aws/lambda/process-attendance',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.processAttendanceLambda = new lambda.Function(this, 'ProcessAttendanceFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'process_attendance.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/attendance'),
            functionName: 'process-attendance',
            timeout: cdk.Duration.seconds(29),
            memorySize: 512,
            logGroup: this.processAttendanceLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                S3_BUCKET_NAME: this.studentImagesBucket.bucketName,
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
                STUDENT_ATTENDANCE_TABLE_NAME: this.studentAttendanceTable.tableName,
                FACE_COMPARISON_QUEUE_URL: this.faceComparisonQueue.queueUrl,
                API_VERSION: 'v1',
            },
        });

        // Grant Lambda permissions to write to S3 (faces/attendance/*)
        this.studentImagesBucket.grantWrite(this.processAttendanceLambda, 'faces/attendance/*');

        // Grant Lambda permissions to read from Students table
        this.studentsTable.grantReadData(this.processAttendanceLambda);

        // Grant Lambda permissions to write to StudentAttendance table
        this.studentAttendanceTable.grantWriteData(this.processAttendanceLambda);

        // Grant Lambda permissions to send messages to SQS queue
        this.faceComparisonQueue.grantSendMessages(this.processAttendanceLambda);

        // Create the compare_student_face Lambda function
        this.compareStudentFaceLambdaLogGroup = new logs.LogGroup(this, 'CompareStudentFaceLogGroup', {
            logGroupName: '/aws/lambda/compare-student-face',
            retention: logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.compareStudentFaceLambda = new lambda.Function(this, 'CompareStudentFaceFunction', {
            runtime: lambda.Runtime.PYTHON_3_13,
            architecture: lambda.Architecture.ARM_64,
            handler: 'compare_student_face.handler',
            code: lambda.Code.fromAsset('../backend/src/lambda/attendance'),
            functionName: 'compare-student-face',
            timeout: cdk.Duration.seconds(45),
            memorySize: 512,
            logGroup: this.compareStudentFaceLambdaLogGroup,
            layers: [this.sharedLambdaLayer],
            environment: {
                S3_BUCKET_NAME: this.studentImagesBucket.bucketName,
                STUDENTS_TABLE_NAME: this.studentsTable.tableName,
                STUDENT_ATTENDANCE_TABLE_NAME: this.studentAttendanceTable.tableName,
                FACE_SIMILARITY_THRESHOLD: '80.0',
                SNS_TOPIC_ARN: this.attendanceNotificationTopic.topicArn,
            },
            //reservedConcurrentExecutions: 2,
        });

        // Grant Lambda permissions to read from S3 (both face_registrations and faces/attendance)
        this.studentImagesBucket.grantRead(this.compareStudentFaceLambda, 'face_registrations/*');
        this.studentImagesBucket.grantRead(this.compareStudentFaceLambda, 'faces/attendance/*');

        // Grant Lambda permissions to read from the Students table
        this.studentsTable.grantReadData(this.compareStudentFaceLambda);

        // Grant Lambda permissions to write to the StudentAttendance table
        this.studentAttendanceTable.grantWriteData(this.compareStudentFaceLambda);

        // Grant Lambda permissions to use Rekognition
        this.compareStudentFaceLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['rekognition:CompareFaces'],
            resources: ['*'],
        }));

        // Grant SNS publish permission to compare_student_face Lambda
        this.attendanceNotificationTopic.grantPublish(this.compareStudentFaceLambda);

        // Configure SQS event source mapping with a batch size of 5
        this.compareStudentFaceLambda.addEventSource(new lambda_event_sources.SqsEventSource(this.faceComparisonQueue, {
            batchSize: 5,
            maxBatchingWindow: cdk.Duration.seconds(5),
            reportBatchItemFailures: true,
        }));

        // Create Cognito User Pool Authorizer for REST API
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [this.userPool],
            authorizerName: 'CognitoAuthorizer',
            identitySource: 'method.request.header.Authorization',
        });

        // Create Lambda integration for REST API
        const registerFaceIntegration = new apigateway.LambdaIntegration(this.registerStudentFaceLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Define CORS configuration for face registration endpoint
        const corsOptions: apigateway.CorsOptions = {
            allowOrigins: ['http://localhost:5173', 'http://localhost:4173'],
            allowMethods: ['POST', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
            allowCredentials: true,
            maxAge: cdk.Duration.hours(1),
        };

        const v1Resource = this.api.root.addResource('v1');
        const studentsResource = v1Resource.addResource('students');
        const meResource = studentsResource.addResource('me');
        const faceResource = meResource.addResource('face', {
            defaultCorsPreflightOptions: corsOptions,
        });

        // Add POST method with authorization and API key requirement
        faceResource.addMethod('POST', registerFaceIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create Lambda integration for process_attendance
        const processAttendanceIntegration = new apigateway.LambdaIntegration(this.processAttendanceLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Add /v1/students/me/attendance endpoint
        const attendanceResource = meResource.addResource('attendance', {
            defaultCorsPreflightOptions: corsOptions,
        });

        // Add a POST method for attendance verification
        attendanceResource.addMethod('POST', processAttendanceIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create Lambda integration for get_student_profile
        const getStudentProfileIntegration = new apigateway.LambdaIntegration(this.getStudentProfileLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Add GET method to /v1/students/me endpoint for retrieving profile
        meResource.addMethod('GET', getStudentProfileIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create Lambda integration for update_student_profile
        const updateStudentProfileIntegration = new apigateway.LambdaIntegration(this.updateStudentProfileLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Add POST method to /v1/students/me endpoint for updating profile
        meResource.addMethod('POST', updateStudentProfileIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create Lambda integration for get_student_courses
        const getStudentCoursesIntegration = new apigateway.LambdaIntegration(this.getStudentCoursesLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Add /v1/students/me/courses endpoint
        const coursesResource = meResource.addResource('courses', {
            defaultCorsPreflightOptions: corsOptions,
        });

        // Add GET method for fetching student courses
        coursesResource.addMethod('GET', getStudentCoursesIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // University API Routes
        // Define CORS configuration for university endpoints
        const universityCorsOptions: apigateway.CorsOptions = {
            allowOrigins: ['http://localhost:5173', 'http://localhost:4173'],
            allowMethods: ['GET', 'POST', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
            allowCredentials: true,
            maxAge: cdk.Duration.hours(1),
        };

        // Create Lambda integrations for university endpoints
        const getUniversityIntegration = new apigateway.LambdaIntegration(this.getUniversityLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const upsertUniversityIntegration = new apigateway.LambdaIntegration(this.upsertUniversityLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const listUniversitiesIntegration = new apigateway.LambdaIntegration(this.listUniversitiesLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Create /v1/universities resource
        const universitiesResource = v1Resource.addResource('universities', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/universities (list all universities)
        universitiesResource.addMethod('GET', listUniversitiesIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        const universityCodeResource = universitiesResource.addResource('{university_code}', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/universities/{university_code}
        universityCodeResource.addMethod('GET', getUniversityIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Add POST /v1/universities/{university_code}
        universityCodeResource.addMethod('POST', upsertUniversityIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Schedule API Routes
        // Create Lambda integrations for schedule endpoints
        const getScheduleIntegration = new apigateway.LambdaIntegration(this.getScheduleLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const upsertScheduleIntegration = new apigateway.LambdaIntegration(this.upsertScheduleLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Create /v1/universities/{university_code}/schedules resource
        const schedulesResource = universityCodeResource.addResource('schedules');
        const scheduleIdResource = schedulesResource.addResource('{schedule_id}', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/universities/{university_code}/schedules/{schedule_id}
        scheduleIdResource.addMethod('GET', getScheduleIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Add POST /v1/universities/{university_code}/schedules/{schedule_id}
        scheduleIdResource.addMethod('POST', upsertScheduleIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Admin Student Management API Routes
        // Create Lambda integrations
        const listStudentsIntegration = new apigateway.LambdaIntegration(this.listStudentsLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const getStudentEnrollmentsIntegration = new apigateway.LambdaIntegration(this.getStudentEnrollmentsLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const enrollStudentIntegration = new apigateway.LambdaIntegration(this.enrollStudentLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        const listSchedulesIntegration = new apigateway.LambdaIntegration(this.listSchedulesLambda, {
            proxy: true,
            allowTestInvoke: true,
        });

        // Create /v1/admin resource
        const adminResource = v1Resource.addResource('admin', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Create /v1/admin/students resource
        const adminStudentsResource = adminResource.addResource('students', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/admin/students (list all students)
        adminStudentsResource.addMethod('GET', listStudentsIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create /v1/admin/students/{user_id} resource
        const adminStudentIdResource = adminStudentsResource.addResource('{user_id}', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Create /v1/admin/students/{user_id}/enrollments resource
        const enrollmentsResource = adminStudentIdResource.addResource('enrollments', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/admin/students/{user_id}/enrollments
        enrollmentsResource.addMethod('GET', getStudentEnrollmentsIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Add POST /v1/admin/students/{user_id}/enrollments
        enrollmentsResource.addMethod('POST', enrollStudentIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create /v1/schedules resource (for listing schedules)
        const schedulesListResource = v1Resource.addResource('schedules', {
            defaultCorsPreflightOptions: universityCorsOptions,
        });

        // Add GET /v1/schedules (list all schedules)
        schedulesListResource.addMethod('GET', listSchedulesIntegration, {
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            apiKeyRequired: true,
        });

        // Create API Key for rate limiting
        this.apiKey = new apigateway.ApiKey(this, 'SmartAttendanceApiKey', {
            apiKeyName: 'smart-attendance-api-key',
            description: 'API Key for smart attendance tracker',
            enabled: true,
        });

        // Create a Usage Plan with rate limiting (1 req/sec, burst 10)
        this.usagePlan = new apigateway.UsagePlan(this, 'SmartAttendanceUsagePlan', {
            name: 'smart-attendance-usage-plan',
            description: 'Usage plan with 1 req/sec rate limit',
            throttle: {
                rateLimit: 100,
                burstLimit: 1000,
            },
            apiStages: [
                {
                    api: this.api,
                    stage: this.api.deploymentStage,
                },
            ],
        });

        // Associate API Key with Usage Plan
        this.usagePlan.addApiKey(this.apiKey);

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
            value: this.api.url,
            description: 'API Gateway endpoint URL',
            exportName: 'SmartAttendanceApiEndpoint',
        });

        new cdk.CfnOutput(this, 'ApiId', {
            value: this.api.restApiId,
            description: 'API Gateway ID',
            exportName: 'SmartAttendanceApiId',
        });

        new cdk.CfnOutput(this, 'ApiKeyId', {
            value: this.apiKey.keyId,
            description: 'API Key ID',
            exportName: 'SmartAttendanceApiKeyId',
        });

        new cdk.CfnOutput(this, 'ApiKeyValue', {
            value: this.apiKey.keyArn,
            description: 'API Key ARN (retrieve value from console)',
        });

        new cdk.CfnOutput(this, 'StudentsTableName', {
            value: this.studentsTable.tableName,
            description: 'DynamoDB Students Table Name',
            exportName: 'SmartAttendanceStudentsTableName',
        });

        new cdk.CfnOutput(this, 'StudentsTableArn', {
            value: this.studentsTable.tableArn,
            description: 'DynamoDB Students Table ARN',
            exportName: 'SmartAttendanceStudentsTableArn',
        });

        new cdk.CfnOutput(this, 'StudentAttendanceTableName', {
            value: this.studentAttendanceTable.tableName,
            description: 'DynamoDB Student Attendance Table Name',
            exportName: 'SmartAttendanceStudentAttendanceTableName',
        });

        new cdk.CfnOutput(this, 'StudentAttendanceTableArn', {
            value: this.studentAttendanceTable.tableArn,
            description: 'DynamoDB Student Attendance Table ARN',
            exportName: 'SmartAttendanceStudentAttendanceTableArn',
        });

        new cdk.CfnOutput(this, 'ClassSchedulesTableName', {
            value: this.classSchedulesTable.tableName,
            description: 'DynamoDB Class Schedules Table Name',
            exportName: 'SmartAttendanceClassSchedulesTableName',
        });

        new cdk.CfnOutput(this, 'ClassSchedulesTableArn', {
            value: this.classSchedulesTable.tableArn,
            description: 'DynamoDB Class Schedules Table ARN',
            exportName: 'SmartAttendanceClassSchedulesTableArn',
        });

        new cdk.CfnOutput(this, 'UniversitiesTableName', {
            value: this.universitiesTable.tableName,
            description: 'DynamoDB Universities Table Name',
            exportName: 'SmartAttendanceUniversitiesTableName',
        });

        new cdk.CfnOutput(this, 'UniversitiesTableArn', {
            value: this.universitiesTable.tableArn,
            description: 'DynamoDB Universities Table ARN',
            exportName: 'SmartAttendanceUniversitiesTableArn',
        });

        new cdk.CfnOutput(this, 'FaceComparisonQueueUrl', {
            value: this.faceComparisonQueue.queueUrl,
            description: 'SQS Face Comparison Queue URL',
            exportName: 'SmartAttendanceFaceComparisonQueueUrl',
        });

        new cdk.CfnOutput(this, 'FaceComparisonQueueArn', {
            value: this.faceComparisonQueue.queueArn,
            description: 'SQS Face Comparison Queue ARN',
            exportName: 'SmartAttendanceFaceComparisonQueueArn',
        });

        new cdk.CfnOutput(this, 'FaceComparisonDLQUrl', {
            value: this.faceComparisonDLQ.queueUrl,
            description: 'SQS Face Comparison Dead Letter Queue URL',
            exportName: 'SmartAttendanceFaceComparisonDLQUrl',
        });

        new cdk.CfnOutput(this, 'ProcessAttendanceLambdaArn', {
            value: this.processAttendanceLambda.functionArn,
            description: 'Lambda ARN for Process Attendance',
            exportName: 'SmartAttendanceProcessAttendanceLambdaArn',
        });

        new cdk.CfnOutput(this, 'ProcessAttendanceLambdaName', {
            value: this.processAttendanceLambda.functionName,
            description: 'Lambda Function Name for Process Attendance',
            exportName: 'SmartAttendanceProcessAttendanceLambdaName',
        });

        new cdk.CfnOutput(this, 'PostConfirmationLambdaArn', {
            value: this.createStudentProfileLambda.functionArn,
            description: 'Post Confirmation Lambda ARN',
            exportName: 'SmartAttendancePostConfirmationLambdaArn',
        });

        new cdk.CfnOutput(this, 'PostConfirmationLambdaName', {
            value: this.createStudentProfileLambda.functionName,
            description: 'Post Confirmation Lambda Function Name',
            exportName: 'SmartAttendancePostConfirmationLambdaName',
        });

        new cdk.CfnOutput(this, 'CompareStudentFaceLambdaArn', {
            value: this.compareStudentFaceLambda.functionArn,
            description: 'Lambda ARN for Compare Student Face',
            exportName: 'SmartAttendanceCompareStudentFaceLambdaArn',
        });

        new cdk.CfnOutput(this, 'CompareStudentFaceLambdaName', {
            value: this.compareStudentFaceLambda.functionName,
            description: 'Lambda Function Name for Compare Student Face',
            exportName: 'SmartAttendanceCompareStudentFaceLambdaName',
        });

        new cdk.CfnOutput(this, 'AttendanceNotificationTopicArn', {
            value: this.attendanceNotificationTopic.topicArn,
            description: 'SNS Topic ARN for Attendance Notifications',
            exportName: 'SmartAttendanceNotificationTopicArn',
        });

        new cdk.CfnOutput(this, 'AttendanceNotificationTopicName', {
            value: this.attendanceNotificationTopic.topicName,
            description: 'SNS Topic Name for Attendance Notifications',
            exportName: 'SmartAttendanceNotificationTopicName',
        });

        new cdk.CfnOutput(this, 'GetStudentProfileLambdaArn', {
            value: this.getStudentProfileLambda.functionArn,
            description: 'Lambda ARN for Get Student Profile',
            exportName: 'SmartAttendanceGetStudentProfileLambdaArn',
        });

        new cdk.CfnOutput(this, 'GetStudentProfileLambdaName', {
            value: this.getStudentProfileLambda.functionName,
            description: 'Lambda Function Name for Get Student Profile',
            exportName: 'SmartAttendanceGetStudentProfileLambdaName',
        });

        new cdk.CfnOutput(this, 'UpdateStudentProfileLambdaArn', {
            value: this.updateStudentProfileLambda.functionArn,
            description: 'Lambda ARN for Update Student Profile',
            exportName: 'SmartAttendanceUpdateStudentProfileLambdaArn',
        });

        new cdk.CfnOutput(this, 'UpdateStudentProfileLambdaName', {
            value: this.updateStudentProfileLambda.functionName,
            description: 'Lambda Function Name for Update Student Profile',
            exportName: 'SmartAttendanceUpdateStudentProfileLambdaName',
        });

        new cdk.CfnOutput(this, 'StudentCoursesTableName', {
            value: this.studentCoursesTable.tableName,
            description: 'DynamoDB Student Courses Table Name',
            exportName: 'SmartAttendanceStudentCoursesTableName',
        });

        new cdk.CfnOutput(this, 'StudentCoursesTableArn', {
            value: this.studentCoursesTable.tableArn,
            description: 'DynamoDB Student Courses Table ARN',
            exportName: 'SmartAttendanceStudentCoursesTableArn',
        });

        new cdk.CfnOutput(this, 'GetStudentCoursesLambdaArn', {
            value: this.getStudentCoursesLambda.functionArn,
            description: 'Lambda ARN for Get Student Courses',
            exportName: 'SmartAttendanceGetStudentCoursesLambdaArn',
        });

        new cdk.CfnOutput(this, 'GetStudentCoursesLambdaName', {
            value: this.getStudentCoursesLambda.functionName,
            description: 'Lambda Function Name for Get Student Courses',
            exportName: 'SmartAttendanceGetStudentCoursesLambdaName',
        });
    }
}
