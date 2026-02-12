package stacks

import (
	"github.com/aws/aws-cdk-go/awscdk/v2"
	"github.com/aws/aws-cdk-go/awscdk/v2/awsbudgets"
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
)

// BudgetStackProps allows configuring the budget threshold and alert email.
type BudgetStackProps struct {
	awscdk.StackProps
	// MonthlyLimitUSD is the monthly budget cap in dollars (default: 250).
	MonthlyLimitUSD float64
	// AlertEmail is the email address to notify when threshold is crossed.
	AlertEmail string
}

// BudgetStack creates an AWS Budget with email alerts at 80% and 100% thresholds.
type BudgetStack struct {
	awscdk.Stack
}

func NewBudgetStack(scope constructs.Construct, id string, props *BudgetStackProps) *BudgetStack {
	stack := awscdk.NewStack(scope, &id, &props.StackProps)

	limit := props.MonthlyLimitUSD
	if limit == 0 {
		limit = 250
	}

	awsbudgets.NewCfnBudget(stack, jsii.String("MonthlyBudget"), &awsbudgets.CfnBudgetProps{
		Budget: &awsbudgets.CfnBudget_BudgetDataProperty{
			BudgetName:  jsii.String("SupplyChain-MonthlyBudget"),
			BudgetType:  jsii.String("COST"),
			TimeUnit:    jsii.String("MONTHLY"),
			BudgetLimit: &awsbudgets.CfnBudget_SpendProperty{
				Amount: jsii.Number(limit),
				Unit:   jsii.String("USD"),
			},
		},
		NotificationsWithSubscribers: &[]*awsbudgets.CfnBudget_NotificationWithSubscribersProperty{
			{
				// Alert at 80% of budget
				Notification: &awsbudgets.CfnBudget_NotificationProperty{
					NotificationType: jsii.String("ACTUAL"),
					ComparisonOperator: jsii.String("GREATER_THAN"),
					Threshold:         jsii.Number(80),
					ThresholdType:     jsii.String("PERCENTAGE"),
				},
				Subscribers: &[]*awsbudgets.CfnBudget_SubscriberProperty{
					{
						SubscriptionType: jsii.String("EMAIL"),
						Address:          jsii.String(props.AlertEmail),
					},
				},
			},
			{
				// Alert at 100% of budget
				Notification: &awsbudgets.CfnBudget_NotificationProperty{
					NotificationType: jsii.String("ACTUAL"),
					ComparisonOperator: jsii.String("GREATER_THAN"),
					Threshold:         jsii.Number(100),
					ThresholdType:     jsii.String("PERCENTAGE"),
				},
				Subscribers: &[]*awsbudgets.CfnBudget_SubscriberProperty{
					{
						SubscriptionType: jsii.String("EMAIL"),
						Address:          jsii.String(props.AlertEmail),
					},
				},
			},
			{
				// Forecast alert at 100% — warns early if trending over budget
				Notification: &awsbudgets.CfnBudget_NotificationProperty{
					NotificationType: jsii.String("FORECASTED"),
					ComparisonOperator: jsii.String("GREATER_THAN"),
					Threshold:         jsii.Number(100),
					ThresholdType:     jsii.String("PERCENTAGE"),
				},
				Subscribers: &[]*awsbudgets.CfnBudget_SubscriberProperty{
					{
						SubscriptionType: jsii.String("EMAIL"),
						Address:          jsii.String(props.AlertEmail),
					},
				},
			},
		},
	})

	awscdk.NewCfnOutput(stack, jsii.String("BudgetLimit"), &awscdk.CfnOutputProps{
		Value:       jsii.String("$250/month"),
		Description: jsii.String("Monthly budget limit — alerts at 80% and 100%"),
	})

	return &BudgetStack{
		Stack: stack,
	}
}
