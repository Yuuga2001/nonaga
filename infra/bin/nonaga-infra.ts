#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NonagaStack } from '../lib/nonaga-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

// Development environment
new NonagaStack(app, 'NonagaStack-Dev', {
  env,
  stackName: 'nonaga-dev',
  description: 'NONAGA Online Game - Development Environment',
});

// Production environment
new NonagaStack(app, 'NonagaStack-Prod', {
  env,
  stackName: 'nonaga-prod',
  description: 'NONAGA Online Game - Production Environment',
});

app.synth();
