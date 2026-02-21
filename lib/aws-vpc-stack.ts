import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class AwsVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'NextWork VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0, // Set to 0 to ensure the private subnet is truly isolated/private per the lesson
      subnetConfiguration: [
        {
          name: 'NextWork Public Subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'NextWork Private Subnet',
          // Changed to ISOLATED so it has no route to an IGW or NAT Gateway
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ],
      maxAzs: 1,
    });

    // 1. PUBLIC NACL (From your previous steps)
    const nextWorkPublicNACL = new ec2.NetworkAcl(this, 'NextWork Public NACL', {
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
    });

    nextWorkPublicNACL.addEntry('AllowAllInbound', {
      cidr: ec2.AclCidr.anyIpv4(),
      ruleNumber: 100,
      traffic: ec2.AclTraffic.allTraffic(),
      direction: ec2.TrafficDirection.INGRESS,
      ruleAction: ec2.Action.ALLOW,
    });

    // 2. PRIVATE NACL (Step #4 of the lesson)
    // Custom NACLs deny all traffic by default, which is what the lesson requests
    const nextWorkPrivateNACL = new ec2.NetworkAcl(this, 'NextWork Private NACL', {
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // 3. SECURITY GROUP (Resource level)
    const NextWorkSG = new ec2.SecurityGroup(this, 'NextWork Security Group', {
      vpc,
      description: 'A security group for the NextWork VPC',
      allowAllOutbound: true,
    });

    NextWorkSG.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(80),
        'Allow HTTP access from the internet'
    );
  }
}