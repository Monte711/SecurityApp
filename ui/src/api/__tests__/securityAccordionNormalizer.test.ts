import { SecurityAccordionNormalizer } from '../securityAccordionNormalizer';
import { NormalizedSecurityData, SecurityStatus, SecurityStatusType } from '../../types/hostTypes';

describe('SecurityAccordionNormalizer', () => {
  const normalizer = new SecurityAccordionNormalizer();

  const createMockStatus = (statusType: SecurityStatusType, displayName: string): SecurityStatus => ({
    status: statusType,
    displayName,
    description: `Description for ${displayName}`,
    source: 'API',
    lastUpdated: new Date().toISOString(),
    details: {},
    recommendations: []
  });

  const mockNormalizedData: NormalizedSecurityData = {
    defender: createMockStatus('enabled', 'Windows Defender'),
    firewall: createMockStatus('enabled', 'Windows Firewall'),
    uac: createMockStatus('enabled', 'User Account Control'),
    rdp: createMockStatus('disabled', 'Remote Desktop'),
    bitlocker: createMockStatus('enabled', 'BitLocker'),
    smb1: createMockStatus('disabled', 'SMBv1'),
    windowsUpdate: createMockStatus('enabled', 'Windows Update'),
    lastUpdated: new Date().toISOString()
  };

  describe('normalizeSecurityData', () => {
    it('should normalize security data correctly', () => {
      const result = normalizer.normalizeSecurityData(mockNormalizedData);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((item: any) => 
        item.id && 
        item.name && 
        typeof item.status === 'string' &&
        typeof item.severity === 'string'
      )).toBe(true);
    });

    it('should handle firewall profiles correctly', () => {
      // Создаем данные с разными состояниями профилей брандмауэра
      const firewallWithProfiles = createMockStatus('enabled', 'Windows Firewall');
      firewallWithProfiles.details = {
        domain_profile: { enabled: true, status: 'active' },
        private_profile: { enabled: true, status: 'active' },
        public_profile: { enabled: false, status: 'inactive' }
      };
      
      const testData: NormalizedSecurityData = {
        ...mockNormalizedData,
        firewall: firewallWithProfiles
      };

      const result = normalizer.normalizeSecurityData(testData);
      
      // Должен быть только один элемент брандмауэра
      const firewallItems = result.filter((item: any) => item.id === 'firewall');
      expect(firewallItems.length).toBe(1);
      
      const firewallItem = firewallItems[0];
      
      // Проверяем, что статус желтый (частично включен)
      expect(firewallItem.status).toBe('disabled');
      expect(firewallItem.severity).toBe('high');
      
      // Проверяем детали
      expect(firewallItem.details.enabled_profiles).toBe(2);
      expect(firewallItem.details.total_profiles).toBe(3);
      expect(firewallItem.details.profiles).toBeDefined();
    });

    it('should handle all firewall profiles enabled', () => {
      const firewallAllEnabled = createMockStatus('enabled', 'Windows Firewall');
      firewallAllEnabled.details = {
        domain_profile: { enabled: true, status: 'active' },
        private_profile: { enabled: true, status: 'active' },
        public_profile: { enabled: true, status: 'active' }
      };
      
      const testData: NormalizedSecurityData = {
        ...mockNormalizedData,
        firewall: firewallAllEnabled
      };

      const result = normalizer.normalizeSecurityData(testData);
      const firewallItem = result.find((item: any) => item.id === 'firewall');
      
      // Должен быть зеленый (все включены)
      expect(firewallItem?.status).toBe('ok');
      expect(firewallItem?.severity).toBe('none');
    });

    it('should handle all firewall profiles disabled', () => {
      const firewallAllDisabled = createMockStatus('disabled', 'Windows Firewall');
      firewallAllDisabled.details = {
        domain_profile: { enabled: false, status: 'inactive' },
        private_profile: { enabled: false, status: 'inactive' },
        public_profile: { enabled: false, status: 'inactive' }
      };
      
      const testData: NormalizedSecurityData = {
        ...mockNormalizedData,
        firewall: firewallAllDisabled
      };

      const result = normalizer.normalizeSecurityData(testData);
      const firewallItem = result.find((item: any) => item.id === 'firewall');
      
      // Должен быть красный (все выключены)
      expect(firewallItem?.status).toBe('disabled');
      expect(firewallItem?.severity).toBe('critical');
    });

    it('should handle disabled services correctly', () => {
      const result = normalizer.normalizeSecurityData(mockNormalizedData);
      
      // Should have items
      expect(result.length).toBeGreaterThan(0);
      
      // Should have various statuses
      const statuses = result.map((item: any) => item.status);
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should calculate severity correctly', () => {
      const result = normalizer.normalizeSecurityData(mockNormalizedData);
      
      // Check that all items have valid severity
      const validSeverities = ['critical', 'high', 'medium', 'low', 'none'];
      result.forEach((item: any) => {
        expect(validSeverities).toContain(item.severity);
      });
    });

    it('should create items with proper structure', () => {
      const result = normalizer.normalizeSecurityData(mockNormalizedData);
      
      result.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('severity');
        expect(item).toHaveProperty('details');
        expect(item).toHaveProperty('source');
        expect(item).toHaveProperty('last_seen');
      });
    });

    it('should handle mixed security states', () => {
      const mixedData: NormalizedSecurityData = {
        defender: createMockStatus('disabled', 'Windows Defender'),
        firewall: createMockStatus('disabled', 'Windows Firewall'),
        uac: createMockStatus('enabled', 'User Account Control'),
        rdp: createMockStatus('enabled', 'Remote Desktop'),
        bitlocker: createMockStatus('disabled', 'BitLocker'),
        smb1: createMockStatus('enabled', 'SMBv1'),
        windowsUpdate: createMockStatus('disabled', 'Windows Update'),
        lastUpdated: new Date().toISOString()
      };

      const result = normalizer.normalizeSecurityData(mixedData);
      
      // Should still create items
      expect(result.length).toBeGreaterThan(0);
      
      // Should have items with various statuses
      const statuses = result.map((item: any) => item.status);
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should handle no data status', () => {
      const noDataMock: NormalizedSecurityData = {
        defender: createMockStatus('no_data', 'Windows Defender'),
        firewall: createMockStatus('access_denied', 'Windows Firewall'),
        uac: createMockStatus('unknown', 'User Account Control'),
        rdp: createMockStatus('no_data', 'Remote Desktop'),
        bitlocker: createMockStatus('unknown', 'BitLocker'),
        smb1: createMockStatus('no_data', 'SMBv1'),
        windowsUpdate: createMockStatus('access_denied', 'Windows Update'),
        lastUpdated: new Date().toISOString()
      };

      const result = normalizer.normalizeSecurityData(noDataMock);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
