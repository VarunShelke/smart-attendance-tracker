#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {SmartAttendanceTrackerStack} from '../lib/smart-attendance-tracker-backend-stack';

const app = new cdk.App();

new SmartAttendanceTrackerStack(app, 'SmartAttendanceTrackerStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Smart Attendance Tracker Infrastructure',
});