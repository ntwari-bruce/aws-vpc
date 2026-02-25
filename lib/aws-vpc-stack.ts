import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class AwsVpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'NextWork VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'NextWork Public Subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'NextWork Private Subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ],
      maxAzs: 1,
    });

    // --- EXISTING SECURITY CONFIG ---
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

    const nextWorkPrivateNACL = new ec2.NetworkAcl(this, 'NextWork Private NACL', {
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

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

    // ************************************************************
    // START OF NEW CODE: LAUNCHING EC2 RESOURCES
    // ************************************************************

    // 1. Create a Key Pair (used for both instances)
    const key = new ec2.KeyPair(this, 'NextWork-KeyPair', {
      keyPairName: 'NextWork-key-pair',
    });

    // 2. Launch the Public EC2 Instance
    const publicInstance = new ec2.Instance(this, 'NextWork Public Server', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: NextWorkSG,
      keyPair: key,
    });

    // 3. Create a Private Security Group (restricts access to the Public SG)
    const privateSG = new ec2.SecurityGroup(this, 'NextWork Private Security Group', {
      vpc,
      description: 'Security group for NextWork Private Subnet',
      allowAllOutbound: true,
    });

    // Allow SSH (Port 22) only from the Public Security Group
    privateSG.addIngressRule(
        NextWorkSG,
        ec2.Port.tcp(22),
        'Allow SSH only from the Public Security Group'
    );

    // 4. Launch the Private EC2 Instance
    const privateInstance = new ec2.Instance(this, 'NextWork Private Server', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroup: privateSG,
      keyPair: key,
    });
  }
}