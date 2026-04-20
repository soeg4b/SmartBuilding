// ============================================================================
// Smart Building Dashboard — Database Seed Script
// Creates demo data for development and testing
// Run: npx prisma db seed  (or  npx ts-node src/database/seed.ts)
// ============================================================================

import { PrismaClient, UserRole, SensorType, SensorStatus, EquipmentType, HealthStatus, AlertSeverity, AlertOperator, FloorPlanFileType, ZoneType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  // ========================================================================
  // 1. Building
  // ========================================================================
  const building = await prisma.building.create({
    data: {
      name: 'Gedung Utama — Pilot Site',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      city: 'Jakarta',
      timezone: 'Asia/Jakarta',
    },
  });
  console.log(`  ✓ Building: ${building.name}`);

  // ========================================================================
  // 2. Users (one per role)
  // ========================================================================
  const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'budi@smartbuilding.id',
        passwordHash,
        name: 'Budi Santoso',
        role: UserRole.financial_decision_maker,
        buildingId: building.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'rina@smartbuilding.id',
        passwordHash,
        name: 'Rina Wijaya',
        role: UserRole.sys_admin,
        buildingId: building.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'agus@smartbuilding.id',
        passwordHash,
        name: 'Agus Prasetyo',
        role: UserRole.technician,
        buildingId: building.id,
        isActive: true,
      },
    }),
  ]);
  console.log(`  ✓ Users: ${users.map((u) => u.name).join(', ')}`);

  // ========================================================================
  // 3. Floors
  // ========================================================================
  const floorData = [
    { name: 'Basement', level: -1, sortOrder: 0 },
    { name: 'Ground Floor', level: 0, sortOrder: 1 },
    { name: '1st Floor', level: 1, sortOrder: 2 },
  ];

  const floors = await Promise.all(
    floorData.map((f) =>
      prisma.floor.create({
        data: { ...f, buildingId: building.id },
      })
    )
  );
  console.log(`  ✓ Floors: ${floors.map((f) => f.name).join(', ')}`);

  const [basement, groundFloor, firstFloor] = floors;

  // ========================================================================
  // 4. Zones
  // ========================================================================
  const zoneData: Array<{
    name: string;
    floorId: string;
    type: ZoneType;
    tempMin?: number;
    tempMax?: number;
    humidityMin?: number;
    humidityMax?: number;
    co2Max?: number;
  }> = [
    { name: 'Generator Room', floorId: basement.id, type: ZoneType.mechanical },
    { name: 'Pump Room', floorId: basement.id, type: ZoneType.mechanical },
    { name: 'Lobby', floorId: groundFloor.id, type: ZoneType.lobby, tempMin: 22, tempMax: 26 },
    { name: 'Reception Area', floorId: groundFloor.id, type: ZoneType.office },
    { name: 'Open Office', floorId: firstFloor.id, type: ZoneType.office, co2Max: 1000 },
    { name: 'Conference Room A', floorId: firstFloor.id, type: ZoneType.conference_room, co2Max: 800 },
  ];

  const zones = await Promise.all(
    zoneData.map((z) =>
      prisma.zone.create({
        data: {
          name: z.name,
          floorId: z.floorId,
          type: z.type,
          ...(z.tempMin !== undefined && { tempMin: z.tempMin }),
          ...(z.tempMax !== undefined && { tempMax: z.tempMax }),
          ...(z.humidityMin !== undefined && { humidityMin: z.humidityMin }),
          ...(z.humidityMax !== undefined && { humidityMax: z.humidityMax }),
          ...(z.co2Max !== undefined && { co2Max: z.co2Max }),
        },
      })
    )
  );
  console.log(`  ✓ Zones: ${zones.map((z) => z.name).join(', ')}`);

  const [generatorRoom, pumpRoom, lobby, reception, openOffice, conferenceRoom] = zones;

  // ========================================================================
  // 5. Sensors (50 sensors across all zones)
  // ========================================================================
  const bid = building.id;
  const sensorDefs: Array<{
    name: string;
    type: SensorType;
    unit: string;
    zoneId: string;
    topicSuffix: string;
  }> = [
    // Lobby sensors
    { name: 'Lobby Temp 1', type: SensorType.temperature, unit: '°C', zoneId: lobby.id, topicSuffix: 'temperature/sen-t-001' },
    { name: 'Lobby Temp 2', type: SensorType.temperature, unit: '°C', zoneId: lobby.id, topicSuffix: 'temperature/sen-t-002' },
    { name: 'Lobby Humidity 1', type: SensorType.humidity, unit: '%', zoneId: lobby.id, topicSuffix: 'humidity/sen-h-001' },
    { name: 'Lobby CO2 1', type: SensorType.co2, unit: 'ppm', zoneId: lobby.id, topicSuffix: 'co2/sen-c-001' },
    { name: 'Lobby Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: lobby.id, topicSuffix: 'energy_meter/sen-e-001' },
    // Reception sensors
    { name: 'Reception Temp 1', type: SensorType.temperature, unit: '°C', zoneId: reception.id, topicSuffix: 'temperature/sen-t-003' },
    { name: 'Reception Humidity 1', type: SensorType.humidity, unit: '%', zoneId: reception.id, topicSuffix: 'humidity/sen-h-002' },
    { name: 'Reception CO2 1', type: SensorType.co2, unit: 'ppm', zoneId: reception.id, topicSuffix: 'co2/sen-c-002' },
    // Open Office sensors
    { name: 'Office Temp 1', type: SensorType.temperature, unit: '°C', zoneId: openOffice.id, topicSuffix: 'temperature/sen-t-004' },
    { name: 'Office Temp 2', type: SensorType.temperature, unit: '°C', zoneId: openOffice.id, topicSuffix: 'temperature/sen-t-005' },
    { name: 'Office Temp 3', type: SensorType.temperature, unit: '°C', zoneId: openOffice.id, topicSuffix: 'temperature/sen-t-006' },
    { name: 'Office Humidity 1', type: SensorType.humidity, unit: '%', zoneId: openOffice.id, topicSuffix: 'humidity/sen-h-003' },
    { name: 'Office Humidity 2', type: SensorType.humidity, unit: '%', zoneId: openOffice.id, topicSuffix: 'humidity/sen-h-004' },
    { name: 'Office CO2 1', type: SensorType.co2, unit: 'ppm', zoneId: openOffice.id, topicSuffix: 'co2/sen-c-003' },
    { name: 'Office CO2 2', type: SensorType.co2, unit: 'ppm', zoneId: openOffice.id, topicSuffix: 'co2/sen-c-004' },
    { name: 'Office Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: openOffice.id, topicSuffix: 'energy_meter/sen-e-002' },
    // Conference Room sensors
    { name: 'Conf Room Temp 1', type: SensorType.temperature, unit: '°C', zoneId: conferenceRoom.id, topicSuffix: 'temperature/sen-t-007' },
    { name: 'Conf Room Humidity 1', type: SensorType.humidity, unit: '%', zoneId: conferenceRoom.id, topicSuffix: 'humidity/sen-h-005' },
    { name: 'Conf Room CO2 1', type: SensorType.co2, unit: 'ppm', zoneId: conferenceRoom.id, topicSuffix: 'co2/sen-c-005' },
    // Generator Room sensors
    { name: 'Genset 1 Fuel Level', type: SensorType.fuel_level, unit: '%', zoneId: generatorRoom.id, topicSuffix: 'fuel_level/sen-f-001' },
    { name: 'Genset 1 Vibration', type: SensorType.vibration, unit: 'mm/s', zoneId: generatorRoom.id, topicSuffix: 'vibration/sen-v-001' },
    { name: 'Genset 1 Runtime', type: SensorType.runtime, unit: 'hours', zoneId: generatorRoom.id, topicSuffix: 'runtime/sen-r-001' },
    { name: 'Genset 1 Temp', type: SensorType.temperature, unit: '°C', zoneId: generatorRoom.id, topicSuffix: 'temperature/sen-t-008' },
    { name: 'Genset 2 Fuel Level', type: SensorType.fuel_level, unit: '%', zoneId: generatorRoom.id, topicSuffix: 'fuel_level/sen-f-002' },
    { name: 'Genset 2 Vibration', type: SensorType.vibration, unit: 'mm/s', zoneId: generatorRoom.id, topicSuffix: 'vibration/sen-v-002' },
    { name: 'Genset 2 Runtime', type: SensorType.runtime, unit: 'hours', zoneId: generatorRoom.id, topicSuffix: 'runtime/sen-r-002' },
    { name: 'Generator Room Temp', type: SensorType.temperature, unit: '°C', zoneId: generatorRoom.id, topicSuffix: 'temperature/sen-t-009' },
    { name: 'Generator Room Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: generatorRoom.id, topicSuffix: 'energy_meter/sen-e-003' },
    // Pump Room sensors
    { name: 'Pump 1 Vibration', type: SensorType.vibration, unit: 'mm/s', zoneId: pumpRoom.id, topicSuffix: 'vibration/sen-v-003' },
    { name: 'Pump 1 Runtime', type: SensorType.runtime, unit: 'hours', zoneId: pumpRoom.id, topicSuffix: 'runtime/sen-r-003' },
    { name: 'Pump 2 Vibration', type: SensorType.vibration, unit: 'mm/s', zoneId: pumpRoom.id, topicSuffix: 'vibration/sen-v-004' },
    { name: 'Pump 2 Runtime', type: SensorType.runtime, unit: 'hours', zoneId: pumpRoom.id, topicSuffix: 'runtime/sen-r-004' },
    { name: 'Pump Room Temp', type: SensorType.temperature, unit: '°C', zoneId: pumpRoom.id, topicSuffix: 'temperature/sen-t-010' },
    { name: 'Pump Room Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: pumpRoom.id, topicSuffix: 'energy_meter/sen-e-004' },
    // Additional power sensors
    { name: 'Main Power Factor', type: SensorType.power_factor, unit: 'PF', zoneId: generatorRoom.id, topicSuffix: 'power_factor/sen-pf-001' },
    { name: 'Main Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: generatorRoom.id, topicSuffix: 'energy_meter/sen-e-005' },
    // Extra environment sensors for coverage
    { name: 'Lobby Temp 3', type: SensorType.temperature, unit: '°C', zoneId: lobby.id, topicSuffix: 'temperature/sen-t-011' },
    { name: 'Office Temp 4', type: SensorType.temperature, unit: '°C', zoneId: openOffice.id, topicSuffix: 'temperature/sen-t-012' },
    { name: 'Office CO2 3', type: SensorType.co2, unit: 'ppm', zoneId: openOffice.id, topicSuffix: 'co2/sen-c-006' },
    { name: 'Conf Room Temp 2', type: SensorType.temperature, unit: '°C', zoneId: conferenceRoom.id, topicSuffix: 'temperature/sen-t-013' },
    { name: 'Reception Temp 2', type: SensorType.temperature, unit: '°C', zoneId: reception.id, topicSuffix: 'temperature/sen-t-014' },
    { name: 'Reception Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: reception.id, topicSuffix: 'energy_meter/sen-e-006' },
    { name: 'Basement Hallway Temp', type: SensorType.temperature, unit: '°C', zoneId: generatorRoom.id, topicSuffix: 'temperature/sen-t-015' },
    { name: 'Lobby Humidity 2', type: SensorType.humidity, unit: '%', zoneId: lobby.id, topicSuffix: 'humidity/sen-h-006' },
    { name: 'Office Humidity 3', type: SensorType.humidity, unit: '%', zoneId: openOffice.id, topicSuffix: 'humidity/sen-h-007' },
    { name: 'Conf Room Humidity 2', type: SensorType.humidity, unit: '%', zoneId: conferenceRoom.id, topicSuffix: 'humidity/sen-h-008' },
    { name: 'Pump Room Humidity', type: SensorType.humidity, unit: '%', zoneId: pumpRoom.id, topicSuffix: 'humidity/sen-h-009' },
    { name: 'Generator Room Humidity', type: SensorType.humidity, unit: '%', zoneId: generatorRoom.id, topicSuffix: 'humidity/sen-h-010' },
    { name: 'Floor 1 Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: openOffice.id, topicSuffix: 'energy_meter/sen-e-007' },
    { name: 'Ground Floor Energy Meter', type: SensorType.energy_meter, unit: 'kWh', zoneId: lobby.id, topicSuffix: 'energy_meter/sen-e-008' },
  ];

  // Build full MQTT topics
  const floorIdMap: Record<string, string> = {};
  zones.forEach((z) => {
    floorIdMap[z.id] = z.floorId;
  });

  const sensors = await Promise.all(
    sensorDefs.map((s) =>
      prisma.sensor.create({
        data: {
          buildingId: bid,
          zoneId: s.zoneId,
          name: s.name,
          type: s.type,
          unit: s.unit,
          mqttTopic: `smartbuilding/${bid}/${floorIdMap[s.zoneId]}/${s.zoneId}/${s.topicSuffix}`,
          status: SensorStatus.offline,
          isActive: true,
        },
      })
    )
  );
  console.log(`  ✓ Sensors: ${sensors.length} created`);

  // ========================================================================
  // 6. Equipment (10 items)
  // ========================================================================
  const equipmentData = [
    { name: 'Genset #1', type: EquipmentType.genset, floorId: basement.id, zoneId: generatorRoom.id, serialNumber: 'GEN-2024-001', manufacturer: 'Caterpillar', model: 'C15', installDate: new Date('2024-01-15') },
    { name: 'Genset #2', type: EquipmentType.genset, floorId: basement.id, zoneId: generatorRoom.id, serialNumber: 'GEN-2024-002', manufacturer: 'Caterpillar', model: 'C15', installDate: new Date('2024-01-15') },
    { name: 'Chilled Water Pump #1', type: EquipmentType.pump, floorId: basement.id, zoneId: pumpRoom.id, serialNumber: 'PMP-2023-001', manufacturer: 'Grundfos', model: 'CR 32-5', installDate: new Date('2023-06-10') },
    { name: 'Chilled Water Pump #2', type: EquipmentType.pump, floorId: basement.id, zoneId: pumpRoom.id, serialNumber: 'PMP-2023-002', manufacturer: 'Grundfos', model: 'CR 32-5', installDate: new Date('2023-06-10') },
    { name: 'AHU Ground Floor', type: EquipmentType.ahu, floorId: groundFloor.id, zoneId: lobby.id, serialNumber: 'AHU-2023-001', manufacturer: 'Daikin', model: 'AHU-500', installDate: new Date('2023-03-01') },
    { name: 'AHU 1st Floor', type: EquipmentType.ahu, floorId: firstFloor.id, zoneId: openOffice.id, serialNumber: 'AHU-2023-002', manufacturer: 'Daikin', model: 'AHU-750', installDate: new Date('2023-03-01') },
    { name: 'Chiller Unit #1', type: EquipmentType.chiller, floorId: basement.id, zoneId: pumpRoom.id, serialNumber: 'CHL-2022-001', manufacturer: 'York', model: 'YVAA', installDate: new Date('2022-11-20') },
    { name: 'Main Transformer', type: EquipmentType.transformer, floorId: basement.id, zoneId: generatorRoom.id, serialNumber: 'TRF-2022-001', manufacturer: 'Schneider', model: 'Trihal', installDate: new Date('2022-08-15') },
    { name: 'Elevator #1', type: EquipmentType.elevator, floorId: groundFloor.id, zoneId: lobby.id, serialNumber: 'ELV-2023-001', manufacturer: 'Otis', model: 'Gen2', installDate: new Date('2023-01-10') },
    { name: 'Elevator #2', type: EquipmentType.elevator, floorId: groundFloor.id, zoneId: lobby.id, serialNumber: 'ELV-2023-002', manufacturer: 'Otis', model: 'Gen2', installDate: new Date('2023-01-10') },
  ];

  const equipmentItems = await Promise.all(
    equipmentData.map((e) =>
      prisma.equipment.create({
        data: {
          buildingId: bid,
          floorId: e.floorId,
          zoneId: e.zoneId,
          name: e.name,
          type: e.type,
          serialNumber: e.serialNumber,
          manufacturer: e.manufacturer,
          model: e.model,
          installDate: e.installDate,
          lastServiceDate: new Date('2026-03-01'),
          nextServiceDate: new Date('2026-09-01'),
          healthStatus: HealthStatus.green,
          isActive: true,
        },
      })
    )
  );
  console.log(`  ✓ Equipment: ${equipmentItems.length} created`);

  // ========================================================================
  // 7. Equipment-Sensor Links
  // ========================================================================
  // Link genset sensors
  const genset1Sensors = sensors.filter((s) =>
    ['Genset 1 Fuel Level', 'Genset 1 Vibration', 'Genset 1 Runtime', 'Genset 1 Temp'].includes(s.name)
  );
  const genset2Sensors = sensors.filter((s) =>
    ['Genset 2 Fuel Level', 'Genset 2 Vibration', 'Genset 2 Runtime'].includes(s.name)
  );
  const pump1Sensors = sensors.filter((s) =>
    ['Pump 1 Vibration', 'Pump 1 Runtime'].includes(s.name)
  );
  const pump2Sensors = sensors.filter((s) =>
    ['Pump 2 Vibration', 'Pump 2 Runtime'].includes(s.name)
  );

  const sensorLinks = [
    ...genset1Sensors.map((s) => ({ equipmentId: equipmentItems[0].id, sensorId: s.id, role: s.type })),
    ...genset2Sensors.map((s) => ({ equipmentId: equipmentItems[1].id, sensorId: s.id, role: s.type })),
    ...pump1Sensors.map((s) => ({ equipmentId: equipmentItems[2].id, sensorId: s.id, role: s.type })),
    ...pump2Sensors.map((s) => ({ equipmentId: equipmentItems[3].id, sensorId: s.id, role: s.type })),
  ];

  for (const link of sensorLinks) {
    await prisma.equipmentSensor.create({ data: link });
  }
  console.log(`  ✓ Equipment-Sensor links: ${sensorLinks.length} created`);

  // ========================================================================
  // 8. Alert Rules
  // ========================================================================
  const sysAdmin = users.find((u) => u.role === UserRole.sys_admin)!;

  const alertRules = await Promise.all([
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'High Temperature Alert',
        sensorType: SensorType.temperature,
        operator: AlertOperator.gt,
        threshold: 30.0,
        severity: AlertSeverity.warning,
        cooldownMinutes: 15,
        emailNotification: true,
        emailRecipients: ['rina@smartbuilding.id'],
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'Critical Temperature Alert',
        sensorType: SensorType.temperature,
        operator: AlertOperator.gt,
        threshold: 35.0,
        severity: AlertSeverity.critical,
        cooldownMinutes: 5,
        emailNotification: true,
        emailRecipients: ['rina@smartbuilding.id', 'agus@smartbuilding.id'],
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'High CO2 Alert',
        sensorType: SensorType.co2,
        operator: AlertOperator.gt,
        threshold: 1000,
        severity: AlertSeverity.warning,
        cooldownMinutes: 15,
        emailNotification: false,
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'Low Fuel Level Alert',
        sensorType: SensorType.fuel_level,
        operator: AlertOperator.lt,
        threshold: 20.0,
        severity: AlertSeverity.critical,
        cooldownMinutes: 30,
        emailNotification: true,
        emailRecipients: ['rina@smartbuilding.id', 'agus@smartbuilding.id'],
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'High Vibration Alert',
        sensorType: SensorType.vibration,
        operator: AlertOperator.gt,
        threshold: 5.0,
        severity: AlertSeverity.warning,
        cooldownMinutes: 15,
        emailNotification: false,
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
    prisma.alertRule.create({
      data: {
        buildingId: bid,
        name: 'Low Humidity Alert',
        sensorType: SensorType.humidity,
        operator: AlertOperator.lt,
        threshold: 30.0,
        severity: AlertSeverity.info,
        cooldownMinutes: 30,
        emailNotification: false,
        isActive: true,
        createdBy: sysAdmin.id,
      },
    }),
  ]);
  console.log(`  ✓ Alert Rules: ${alertRules.length} created`);

  // ========================================================================
  // 9. Energy Tariff
  // ========================================================================
  await prisma.energyTariff.create({
    data: {
      buildingId: bid,
      name: 'PLN Standard — Tarif Industri I-3',
      ratePerKwh: 1444.70,
      currency: 'IDR',
      effectiveFrom: new Date('2026-01-01'),
      createdBy: sysAdmin.id,
    },
  });
  console.log('  ✓ Energy Tariff: PLN Standard');

  // ========================================================================
  // 10. Summary
  // ========================================================================
  console.log('\n✅ Seed complete!');
  console.log('   Login credentials for all users: Password123!');
  console.log('   Emails: budi@smartbuilding.id, rina@smartbuilding.id, agus@smartbuilding.id');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
