# Project Contacts & Resources

## Project Team

### Project Owner
- **Name**: [To be filled]
- **Role**: Technical Lead / Product Owner
- **Email**: [contact@company.com]
- **Responsibility**: Overall project direction and technical decisions

### Development Team
- **Lead Developer**: [To be assigned]
- **Security Engineer**: [To be assigned]  
- **DevOps Engineer**: [To be assigned]
- **QA Engineer**: [To be assigned]

### Stakeholders
- **Business Sponsor**: [To be assigned]
- **Security Architect**: [To be assigned]
- **Compliance Officer**: [To be assigned]

## External Resources

### Technical Support
- **Infrastructure Support**: [Cloud provider contact]
- **Security Consulting**: [Security firm contact]
- **Compliance Advisor**: [Legal/compliance firm]

### Vendor Contacts
- **OpenSearch Support**: Community forums / Commercial support
- **Redis Support**: Redis Labs support / Community
- **MISP Support**: MISP community / Professional services

## Access & Credentials

### Development Environment Access
- **Git Repository**: GitHub repository with team access
- **CI/CD Pipeline**: GitHub Actions / Jenkins credentials
- **Development Infrastructure**: Docker Hub / Container registry access
- **Documentation**: Confluence / Wiki access

### Production Environment Access (Future)
- **Production Infrastructure**: [Cloud provider credentials]
- **Monitoring Systems**: [Monitoring platform access]
- **Certificate Management**: [Certificate authority access]
- **Backup Systems**: [Backup service credentials]

## Secrets & Key Management

### Secret Storage Locations
⚠️ **IMPORTANT**: No actual secrets are stored in this repository!

**Development Secrets**:
- Location: Local `.env` files (not committed)
- Backup: Local secure storage / Password manager
- Access: Development team members only

**Production Secrets** (Future):
- Location: HashiCorp Vault / AWS Secrets Manager / Azure Key Vault
- Backup: Encrypted backup in secure location
- Access: Production team with MFA required

### API Keys & Tokens
```yaml
Required API Keys:
  misp_api_key:
    description: "MISP threat intelligence API access"
    rotation: "90 days"
    access_level: "read/write IOCs"
    
  openvas_credentials:
    description: "OpenVAS vulnerability scanner access"
    rotation: "60 days"
    access_level: "scan management"
    
  ingest_api_keys:
    description: "Agent authentication for ingest API"
    rotation: "30 days"
    access_level: "event submission only"
    
  dashboard_session_secret:
    description: "Web dashboard session encryption"
    rotation: "7 days"
    access_level: "session management"
```

## Communication Channels

### Team Communication
- **Primary**: Microsoft Teams / Slack workspace
- **Code Reviews**: GitHub pull request discussions
- **Issues**: GitHub Issues / Jira project
- **Documentation**: Confluence / Wiki updates

### Incident Response
- **Emergency Contact**: [24/7 phone number]
- **Incident Escalation**: [Escalation matrix]
- **External Notification**: [Customer/stakeholder contact list]

## Documentation Repositories

### Technical Documentation
- **Architecture**: This repository `/docs` folder
- **API Documentation**: Auto-generated OpenAPI specs
- **Runbooks**: This repository operational guides
- **Deployment Guides**: Infrastructure documentation

### Project Management
- **Project Plan**: [Project management tool link]
- **Requirements**: [Requirements repository]
- **Meeting Notes**: [Meeting notes storage]
- **Decision Log**: Architecture Decision Records in this repo

## Compliance & Legal

### Data Protection Officer
- **Name**: [DPO Name]
- **Email**: [dpo@company.com]
- **Responsibility**: GDPR and privacy compliance

### Legal Counsel
- **Firm**: [Law firm name]
- **Contact**: [Legal contact information]
- **Specialty**: Technology and cybersecurity law

### Compliance Resources
- **ISO 27001 Consultant**: [Consultant contact]
- **SOC 2 Auditor**: [Auditing firm contact]
- **Russian Compliance**: [Local legal counsel]

## Vendor & Partnership Contacts

### Technology Partners
```yaml
Infrastructure Providers:
  - name: "Cloud Provider"
    contact: "support@provider.com"
    account_manager: "[Name]"
    
  - name: "CDN Provider"  
    contact: "support@cdn.com"
    account_manager: "[Name]"

Security Partners:
  - name: "Threat Intelligence Provider"
    contact: "support@threat-intel.com"
    feed_access: "[API endpoint]"
    
  - name: "Certificate Authority"
    contact: "support@ca.com"
    certificate_management: "[Portal link]"
```

### Open Source Communities
- **OpenSearch**: Community forums and GitHub
- **MISP**: MISP community Slack and mailing lists
- **ClamAV**: ClamAV community forums
- **YARA**: YARA community GitHub discussions

## Emergency Procedures

### Security Incident Response
1. **Immediate Contact**: [Security team lead phone]
2. **Escalation**: [CISO contact information]
3. **External**: [Incident response firm contact]
4. **Legal**: [Legal counsel emergency contact]

### System Outage Response
1. **Technical Lead**: [Primary technical contact]
2. **Infrastructure**: [Infrastructure team contact]
3. **Communications**: [Communications team for customer updates]

### Business Continuity
- **Backup Team Lead**: [Secondary technical lead]
- **Alternative Infrastructure**: [DR provider contact]
- **Customer Communication**: [Customer success team]

## Access Recovery

### Lost Access Recovery
- **Git Repository**: Repository administrator contact
- **Infrastructure**: Platform administrator access
- **Domain/DNS**: Domain registrar contact information
- **Email**: Email administrator contact

### Account Recovery Procedures
1. Contact project owner with verification
2. Provide alternative contact method
3. Complete security verification process
4. Update access logs and documentation

## Monitoring & Alerting

### System Monitoring Contacts
- **Primary On-Call**: [Rotation schedule / PagerDuty]
- **Secondary On-Call**: [Backup contact]
- **Infrastructure Alerts**: [Alert recipient list]

### Business Alerts
- **Performance Issues**: [Performance team contact]
- **Security Alerts**: [Security team contact]
- **Compliance Issues**: [Compliance team contact]

## Knowledge Transfer

### Documentation Handover
- **Technical Documentation**: Complete and up-to-date in repository
- **Operational Procedures**: RUNBOOK.md and related docs
- **Architecture**: ARCHITECTURE.md and design decisions
- **Security**: SECURITY_REQUIREMENTS.md

### Training Resources
- **Platform Overview**: PROJECT_OVERVIEW.md
- **Development Setup**: HOW_TO_CONTINUE.md
- **Operational Procedures**: RUNBOOK.md
- **Troubleshooting**: INFRA/README.md

---

## Important Notes

⚠️ **Security Notice**: This file may contain sensitive contact information. Ensure proper access controls are in place.

🔄 **Maintenance**: Update contact information regularly and verify accessibility.

📋 **Verification**: Test emergency contacts and procedures periodically.

---

*Last Updated: 2025-08-20*  
*Next Review: 2025-11-20*
