#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {SmartAttendanceTrackerBackendStack} from '../lib/smart-attendance-tracker-backend-stack';
import {SmartAttendanceTrackerFrontendStack} from '../lib/smart-attendance-tracker-frontend-stack';

const app = new cdk.App();

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new SmartAttendanceTrackerBackendStack(app, 'SmartAttendanceTrackerBackendStack', {
    env,
    description: 'Smart Attendance Tracker Backend Infrastructure',
});

new SmartAttendanceTrackerFrontendStack(app, 'SmartAttendanceTrackerFrontendStack', {
    env,
    description: 'Smart Attendance Tracker Frontend Infrastructure (Cognito + Amplify Hosting)',
});