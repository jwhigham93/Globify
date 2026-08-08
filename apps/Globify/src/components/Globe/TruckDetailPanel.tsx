/**
 * TruckDetailPanel — slide-out panel showing selected vehicle details.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { color, space, type, surface } from '../ui/theme';
import { useHudLayout } from '../ui/layout';
import { ShapeCell } from '../ui/Shape';
import { CloseButton } from '../ui/CloseButton';
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

const TruckDetailPanelImpl: React.FC<TruckDetailPanelProps> = ({
  vehicle,
  onClose,
}) => {
  const { slot, isNarrow } = useHudLayout();
  if (!vehicle) return null;

  const statusColor = statusColors[vehicle.gpsStatus] ?? TRUCK_COLOR_LOST;
  const tripInfo = computeTripStatus(vehicle.gpsStatus, vehicle.speedMph);
  const displayName = vehicle.vehicleName || vehicle.vehicleId;

  return (
    <View
      style={[
        surface.panel,
        panelStyles.container,
        isNarrow && panelStyles.containerNarrow,
        slot(isNarrow ? 'sheet' : 'top-left'),
      ]}
      testID="truck-detail-panel"
    >
      <View style={panelStyles.header}>
        <View style={panelStyles.headerLeft}>
          {/* Square status swatch — brutalist, and no glyph metrics to fight. */}
          <View style={[panelStyles.statusSwatch, { backgroundColor: statusColor }]} />
          <Text style={panelStyles.title}>{displayName}</Text>
        </View>
        <CloseButton
          onPress={onClose}
          accessibilityLabel="Close truck details"
          testID="truck-detail-close"
        />
      </View>

      {/* Trip status badge */}
      <View style={[panelStyles.statusBadge, { borderColor: tripInfo.color }]}>
        <Text style={[panelStyles.statusLabel, { color: tripInfo.color }]}>
          {tripInfo.label}
        </Text>
      </View>

      {/* Route: origin → destination */}
      {(vehicle.originName || vehicle.destinationName) && (
        <View style={panelStyles.routeSection}>
          <View style={panelStyles.routeRow}>
            <ShapeCell kind="square" tint={color.textDim} />
            <Text style={panelStyles.routeText}>{vehicle.originName ?? '—'}</Text>
          </View>
          <View style={panelStyles.routeLine} />
          <View style={panelStyles.routeRow}>
            <ShapeCell kind="square" tint={color.gps.live} />
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
    width: 270,
    padding: space.md,
  },
  containerNarrow: {
    width: undefined,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: space.sm,
  },
  statusSwatch: {
    width: 10,
    height: 10,
  },
  title: {
    ...type.title,
    textTransform: 'none',
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    marginBottom: space.sm,
  },
  statusLabel: {
    ...type.label,
    fontSize: 10,
  },
  routeSection: {
    marginBottom: space.xs + 2,
    paddingLeft: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
  },
  routeLine: {
    width: 1,
    height: 10,
    backgroundColor: color.lineDim,
    marginLeft: 7,
    marginVertical: 1,
  },
  routeText: {
    ...type.body,
    fontWeight: '700',
  },
  divider: {
    ...surface.divider,
    marginVertical: space.xs + 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  label: {
    ...type.body,
    color: color.textDim,
  },
  value: {
    ...type.value,
  },
});

/** Memoized: the HUD re-renders on unrelated state changes. */
export const TruckDetailPanel = React.memo(TruckDetailPanelImpl);
