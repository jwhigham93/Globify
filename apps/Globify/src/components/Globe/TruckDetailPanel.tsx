/**
 * TruckDetailPanel — slide-out panel showing selected vehicle details.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import type { VehiclePosition } from '../../services/useVehiclePositions';
import { computeTripStatus, formatTravelTime } from '../../services/truckStatus';
import {
  TRUCK_COLOR_LIVE,
  TRUCK_COLOR_STALE,
  TRUCK_COLOR_LOST,
} from './constants';

interface TruckDetailPanelProps {
  vehicle: VehiclePosition | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  live: TRUCK_COLOR_LIVE,
  stale: TRUCK_COLOR_STALE,
  lost: TRUCK_COLOR_LOST,
};

export const TruckDetailPanel: React.FC<TruckDetailPanelProps> = ({
  vehicle,
  onClose,
}) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 600;
  if (!vehicle) return null;

  const color = statusColors[vehicle.gpsStatus] ?? TRUCK_COLOR_LOST;
  const tripInfo = computeTripStatus(vehicle.gpsStatus, vehicle.speedMph);
  const displayName = vehicle.vehicleName || vehicle.vehicleId;

  return (
    <View style={isNarrow ? panelStyles.containerNarrow : panelStyles.container}>
      <View style={panelStyles.header}>
        <View style={panelStyles.headerLeft}>
          <View style={[panelStyles.statusDot, { backgroundColor: color }]} />
          <Text style={panelStyles.title}>{displayName}</Text>
        </View>
        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
          <Text style={panelStyles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Trip status badge */}
      <View style={[panelStyles.statusBadge, { backgroundColor: tripInfo.color + '22', borderColor: tripInfo.color + '55' }]}>
        <Text style={[panelStyles.statusIcon, { color: tripInfo.color }]}>{tripInfo.icon}</Text>
        <Text style={[panelStyles.statusLabel, { color: tripInfo.color }]}>{tripInfo.label}</Text>
      </View>

      {/* Route: origin → destination */}
      {(vehicle.originName || vehicle.destinationName) && (
        <View style={panelStyles.routeSection}>
          <View style={panelStyles.routeRow}>
            <Text style={panelStyles.routeDot}>●</Text>
            <Text style={panelStyles.routeText}>{vehicle.originName ?? '—'}</Text>
          </View>
          <View style={panelStyles.routeLine} />
          <View style={panelStyles.routeRow}>
            <Text style={panelStyles.routePin}>◉</Text>
            <Text style={panelStyles.routeText}>{vehicle.destinationName ?? '—'}</Text>
          </View>
        </View>
      )}

      <View style={panelStyles.divider} />

      {/* Travel time */}
      {vehicle.routeStartedAt && (
        <View style={panelStyles.row}>
          <Text style={panelStyles.label}>Travel Time</Text>
          <Text style={panelStyles.value}>{formatTravelTime(vehicle.routeStartedAt)}</Text>
        </View>
      )}

      <View style={panelStyles.row}>
        <Text style={panelStyles.label}>Lat / Lng</Text>
        <Text style={panelStyles.value}>
          {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
        </Text>
      </View>

      {vehicle.heading != null && (
        <View style={panelStyles.row}>
          <Text style={panelStyles.label}>Heading</Text>
          <Text style={panelStyles.value}>{vehicle.heading.toFixed(0)}°</Text>
        </View>
      )}

      {vehicle.speedMph != null && (
        <View style={panelStyles.row}>
          <Text style={panelStyles.label}>Speed</Text>
          <Text style={panelStyles.value}>
            {vehicle.speedMph.toFixed(0)} mph
          </Text>
        </View>
      )}

      <View style={panelStyles.row}>
        <Text style={panelStyles.label}>Last Ping</Text>
        <Text style={panelStyles.value}>
          {new Date(vehicle.recordedAt).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 270,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  containerNarrow: {
    position: 'absolute',
    bottom: 80,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    paddingHorizontal: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeSection: {
    marginBottom: 6,
    paddingLeft: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
  },
  routePin: {
    color: '#00E676',
    fontSize: 10,
  },
  routeLine: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 3,
    marginVertical: 1,
  },
  routeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  value: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
