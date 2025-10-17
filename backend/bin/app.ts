#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {SmartAttendanceTrackerBackendStack} from '../lib/smart-attendance-tracker-backend-stack';

const app = new cdk.App();
new SmartAttendanceTrackerBackendStack(app, 'SmartAttendanceTrackerBackendStack', {});