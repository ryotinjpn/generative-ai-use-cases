import { Stack, StackProps } from 'aws-cdk-lib';
import { Topic, TopicPolicy } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { PolicyStatement, Effect, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';
import { ProcessedStackInput } from './stack-input';

interface BudgetStackProps extends StackProps {
  readonly params: ProcessedStackInput;
}

export class BudgetsAlarmStack extends Stack {
  constructor(scope: Construct, id: string, props: BudgetStackProps) {
    super(scope, id, props);

    const budgetsTopicName = 'notice-budgets';
    const emailAddress = 'ryotinjpn@gmail.com';

    // SNS Topic (予算アラート通知用)
    const budgetsTopic = new Topic(this, 'BudgetsTopic', {
      topicName: budgetsTopicName,
      displayName: budgetsTopicName,
    });

    // メール通知用のサブスクリプションを追加
    budgetsTopic.addSubscription(new EmailSubscription(emailAddress));

    // SNS Topic Policy
    const topicPolicy = new TopicPolicy(this, 'BudgetsTopicPolicy', {
      topics: [budgetsTopic],
    });

    topicPolicy.document.addStatements(
      new PolicyStatement({
        sid: 'BudgetsSNSPolicy',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('events.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [budgetsTopic.topicArn],
        conditions: {
          StringEquals: {
            'AWS:SourceAccount': this.account,
          },
        },
      }),
      new PolicyStatement({
        sid: 'AWSBudgetsNotificationPolicy',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('budgets.amazonaws.com')],
        actions: ['sns:Publish'],
        resources: [budgetsTopic.topicArn],
      })
    );

    // Budgets
    new CfnBudget(this, 'Budget', {
      budget: {
        budgetName: `budget-for-generative-ai-use-cases`,
        budgetLimit: {
          amount: 30,
          unit: 'USD',
        },
        budgetType: 'COST',
        costTypes: {
          useBlended: true,
        },
        timeUnit: 'MONTHLY',
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
          },
          subscribers: [
            { subscriptionType: 'SNS', address: budgetsTopic.topicArn },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 50,
          },
          subscribers: [
            { subscriptionType: 'SNS', address: budgetsTopic.topicArn },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 75,
          },
          subscribers: [
            { subscriptionType: 'SNS', address: budgetsTopic.topicArn },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
          },
          subscribers: [
            { subscriptionType: 'SNS', address: budgetsTopic.topicArn },
          ],
        },
      ],
    });
  }
}
