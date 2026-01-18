import * as cdk from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class NonagaStack extends cdk.Stack {
  public readonly graphqlUrl: cdk.CfnOutput;
  public readonly apiKey: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for game sessions
    const gameTable = new dynamodb.Table(this, 'GameSessionsTable', {
      tableName: `NonagaGameSessions-${this.stackName}`,
      partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI for listing waiting games (optional, for future matchmaking)
    gameTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Lambda function for game logic
    const gameHandler = new nodejs.NodejsFunction(this, 'GameHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambda/gameHandler.ts'),
      environment: {
        TABLE_NAME: gameTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Grant Lambda access to DynamoDB
    gameTable.grantReadWriteData(gameHandler);

    // AppSync GraphQL API
    const api = new appsync.GraphqlApi(this, 'NonagaApi', {
      name: `nonaga-api-${this.stackName}`,
      definition: appsync.Definition.fromFile(
        path.join(__dirname, '../graphql/schema.graphql')
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365)),
          },
        },
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ERROR,
      },
    });

    // DynamoDB Data Source (for getGame query)
    const gameDataSource = api.addDynamoDbDataSource(
      'GameDataSource',
      gameTable
    );

    // Lambda Data Source (for mutations)
    const lambdaDataSource = api.addLambdaDataSource(
      'LambdaDataSource',
      gameHandler
    );

    // Query: getGame (direct DynamoDB access for read performance)
    gameDataSource.createResolver('GetGameResolver', {
      typeName: 'Query',
      fieldName: 'getGame',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        'gameId',
        'gameId'
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // Mutation: createGame (via Lambda)
    lambdaDataSource.createResolver('CreateGameResolver', {
      typeName: 'Mutation',
      fieldName: 'createGame',
    });

    // Mutation: joinGame (via Lambda)
    lambdaDataSource.createResolver('JoinGameResolver', {
      typeName: 'Mutation',
      fieldName: 'joinGame',
    });

    // Mutation: movePiece (via Lambda)
    lambdaDataSource.createResolver('MovePieceResolver', {
      typeName: 'Mutation',
      fieldName: 'movePiece',
    });

    // Mutation: moveTile (via Lambda)
    lambdaDataSource.createResolver('MoveTileResolver', {
      typeName: 'Mutation',
      fieldName: 'moveTile',
    });

    // Mutation: abandonGame (via Lambda)
    lambdaDataSource.createResolver('AbandonGameResolver', {
      typeName: 'Mutation',
      fieldName: 'abandonGame',
    });

    // Outputs
    this.graphqlUrl = new cdk.CfnOutput(this, 'GraphQLApiUrl', {
      value: api.graphqlUrl,
      description: 'AppSync GraphQL API URL',
      exportName: `${this.stackName}-GraphQLApiUrl`,
    });

    this.apiKey = new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: api.apiKey || '',
      description: 'AppSync API Key',
      exportName: `${this.stackName}-GraphQLApiKey`,
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: gameTable.tableName,
      description: 'DynamoDB Table Name',
      exportName: `${this.stackName}-DynamoDBTableName`,
    });
  }
}
