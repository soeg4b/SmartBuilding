import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

const mockPrisma = {
  sensor: {
    findMany: vi.fn(),
  },
  sensorReading: {
    findFirst: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

vi.mock('@backend/config/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { EnergyService } from '@backend/modules/energy/energy.service';

describe('EnergyService', () => {
  let energyService: EnergyService;

  const buildingId = '550e8400-e29b-41d4-a716-446655440099';

  const mockSensors = [
    { id: 's1', name: 'Main Meter', unit: 'kWh', status: 'online', lastSeenAt: new Date() },
    { id: 's2', name: 'Floor 1 Meter', unit: 'kWh', status: 'online', lastSeenAt: new Date() },
  ];

  beforeEach(() => {
    energyService = new EnergyService();
    vi.clearAllMocks();
  });

  // =========================================================================
  // getConsumption()
  // =========================================================================
  describe('getConsumption()', () => {
    it('should return total kWh and sensor readings', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue(mockSensors);
      mockPrisma.sensorReading.findFirst
        .mockResolvedValueOnce({ value: 150.5, time: new Date() })
        .mockResolvedValueOnce({ value: 75.3, time: new Date() });

      const result = await energyService.getConsumption(buildingId);

      expect(result.buildingId).toBe(buildingId);
      expect(result.totalCurrentKwh).toBeCloseTo(225.8);
      expect(result.sensors).toHaveLength(2);
      expect(result.sensors[0].sensorName).toBe('Main Meter');
      expect(result.sensors[0].currentValue).toBe(150.5);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle no sensors', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue([]);

      const result = await energyService.getConsumption(buildingId);

      expect(result.totalCurrentKwh).toBe(0);
      expect(result.sensors).toHaveLength(0);
    });

    it('should handle sensors with no readings', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue([mockSensors[0]]);
      mockPrisma.sensorReading.findFirst.mockResolvedValue(null);

      const result = await energyService.getConsumption(buildingId);

      expect(result.totalCurrentKwh).toBe(0);
      expect(result.sensors[0].currentValue).toBeNull();
      expect(result.sensors[0].lastReadingAt).toBeNull();
    });

    it('should only query active energy_meter sensors', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue([]);

      await energyService.getConsumption(buildingId);

      expect(mockPrisma.sensor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            buildingId,
            type: 'energy_meter',
            isActive: true,
          }),
        })
      );
    });
  });

  // =========================================================================
  // getTrends()
  // =========================================================================
  describe('getTrends()', () => {
    const trendParams = {
      buildingId,
      from: '2026-04-01T00:00:00Z',
      to: '2026-04-15T00:00:00Z',
      interval: 'daily',
    };

    it('should return time-series data with summary', async () => {
      mockPrisma.sensor.findMany
        .mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }]) // energy meters
        .mockResolvedValueOnce([]); // power factor sensors

      const seriesData = [
        { bucket: new Date('2026-04-01'), kwh: 500, peak_kw: 80 },
        { bucket: new Date('2026-04-02'), kwh: 450, peak_kw: 75 },
        { bucket: new Date('2026-04-03'), kwh: 600, peak_kw: 95 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(seriesData);

      const result = await energyService.getTrends(trendParams);

      expect(result.buildingId).toBe(buildingId);
      expect(result.interval).toBe('daily');
      expect(result.series).toHaveLength(3);
      expect(result.summary.totalKwh).toBe(1550);
      expect(result.summary.peakKw).toBe(95);
    });

    it('should return empty series when no sensors exist', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue([]);

      const result = await energyService.getTrends(trendParams);

      expect(result.series).toHaveLength(0);
      expect(result.summary.totalKwh).toBe(0);
      expect(result.summary.peakKw).toBe(0);
    });

    it('should handle comparison with previous period', async () => {
      mockPrisma.sensor.findMany
        .mockResolvedValueOnce([{ id: 's1' }])
        .mockResolvedValueOnce([]);

      const currentSeries = [
        { bucket: new Date('2026-04-01'), kwh: 500, peak_kw: 80 },
      ];
      const compSeries = [
        { bucket: new Date('2026-03-18'), kwh: 480, peak_kw: 77 },
      ];

      mockPrisma.$queryRaw
        .mockResolvedValueOnce(currentSeries)
        .mockResolvedValueOnce(compSeries);

      const result = await energyService.getTrends({
        ...trendParams,
        compare: 'previous_period',
      });

      expect(result.comparison).toBeDefined();
      expect(result.comparison).toHaveLength(1);
      expect(result.comparison[0].kwh).toBe(480);
    });

    it('should calculate average power factor when power factor sensors exist', async () => {
      mockPrisma.sensor.findMany
        .mockResolvedValueOnce([{ id: 's1' }])
        .mockResolvedValueOnce([{ id: 'pf1' }]);

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ bucket: new Date(), kwh: 100, peak_kw: 50 }])
        .mockResolvedValueOnce([{ avg_pf: 0.925 }]);

      const result = await energyService.getTrends(trendParams);

      expect(result.summary.avgPowerFactor).toBe(0.93); // Rounded to 2 decimals
    });
  });

  // =========================================================================
  // getPeakLoad()
  // =========================================================================
  describe('getPeakLoad()', () => {
    it('should return 0 peak when no sensors exist', async () => {
      mockPrisma.sensor.findMany.mockResolvedValue([]);

      const result = await energyService.getPeakLoad({
        buildingId,
        from: '2026-04-01T00:00:00Z',
        to: '2026-04-15T00:00:00Z',
      });

      expect(result.peakKw).toBe(0);
      expect(result.peakTimestamp).toBeNull();
    });
  });
});
