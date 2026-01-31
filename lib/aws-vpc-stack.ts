import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class AwsVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'NextWork VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public-1',
          subnetType:ec2.SubnetType.PUBLIC,
          cidrMask: 24, // this creates a 10.0.0.x.0/24 range
        },
        {
          name: 'Private-1',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24, // this creates a 10.0.1.x.0/24 range
        }
      ],
      maxAzs: 1,
    });
  }
}
