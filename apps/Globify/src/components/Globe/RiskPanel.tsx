/**
 * Risk Summary Panel Component
 *
 * Displays concentration risk metrics when the risk view mode is active.
 * Shows network diversification score, supplier risk rankings, and DC diversification.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { color, border, space, type, surface } from '../ui/theme';
import { useHudLayout } from '../ui/layout';
import type { NetworkRiskMetrics } from './types';

export interface RiskPanelProps {
  metrics: NetworkRiskMetrics;
  visible: boolean;
}

/**
 * Get color for a risk score value
 */
function getRiskColor(score: number): string {
  if (score >= 35) return color.risk.high;
  if (score >= 20) return color.risk.med;
  return color.risk.low;
}

/**
 * Get color for a diversification score (inverted from risk)
 */
function getDiversificationColor(score: number): string {
  if (score >= 70) return color.risk.low;
  if (score >= 30) return color.risk.med;
  return color.risk.high;
}

/**
 * Risk level badge — a solid inverted block rather than a translucent tint.
 */
const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const fill =
    level === 'high'
      ? color.risk.high
      : level === 'medium'
      ? color.risk.med
      : color.risk.low;
  return (
    <View style={[panelStyles.badge, { backgroundColor: fill }]}>
      <Text style={panelStyles.badgeText}>{level.toUpperCase()}</Text>
    </View>
  );
};

/**
 * Horizontal risk bar
 */
const RiskBar: React.FC<{ score: number; maxScore?: number }> = ({
  score,
  maxScore = 50,
}) => {
  const width = Math.min((score / maxScore) * 100, 100);
  return (
    <View style={panelStyles.barContainer}>
      <View
        style={[
          panelStyles.bar,
          { width: `${width}%`, backgroundColor: getRiskColor(score) },
        ]}
      />
    </View>
  );
};

const RiskPanelImpl: React.FC<RiskPanelProps> = ({ metrics, visible }) => {
  const { slot, isNarrow } = useHudLayout();

  if (!visible) return null;

  return (
    <View
      style={[
        surface.panel,
        panelStyles.container,
        isNarrow && panelStyles.containerNarrow,
        slot('top-right'),
      ]}
      testID="risk-panel"
    >
      <ScrollView style={panelStyles.scroll} showsVerticalScrollIndicator={false}>
        {/* Network Score */}
        <Text style={panelStyles.title}>Network Risk</Text>
        <View style={panelStyles.scoreRow}>
          <Text style={panelStyles.bigScore}>
            {metrics.networkDiversificationScore}
          </Text>
          <View>
            <Text style={panelStyles.scoreLabel}>Diversification</Text>
            <Text style={panelStyles.scoreSubLabel}>
              HHI: {metrics.hhi.toFixed(4)}
            </Text>
          </View>
        </View>

        {/* Supplier Rankings */}
        <Text style={panelStyles.sectionTitle}>Supplier Concentration</Text>
        {metrics.supplierRisks.map((supplier) => (
          <View key={supplier.supplierId} style={panelStyles.itemRow}>
            <View style={panelStyles.itemHeader}>
              <Text style={panelStyles.itemName} numberOfLines={1}>
                {supplier.name}
              </Text>
              <RiskBadge level={supplier.riskLevel} />
            </View>
            <RiskBar score={supplier.riskScore} />
            <Text style={panelStyles.itemDetail}>
              {supplier.volumeShare.toFixed(1)}% of volume · {supplier.dcCount} DCs ·{' '}
              {supplier.totalVolume.toLocaleString()} units/wk
            </Text>
          </View>
        ))}

        {/* DC Diversification */}
        <Text style={panelStyles.sectionTitle}>DC Diversification</Text>
        {metrics.dcDiversification.map((dc) => (
          <View key={dc.dcId} style={panelStyles.itemRow}>
            <View style={panelStyles.itemHeader}>
              <Text style={panelStyles.itemName} numberOfLines={1}>
                {dc.name}
              </Text>
              <Text
                style={[
                  panelStyles.divScore,
                  { color: getDiversificationColor(dc.diversificationScore) },
                ]}
              >
                {dc.diversificationScore.toFixed(0)}
              </Text>
            </View>
            <Text style={panelStyles.itemDetail}>
              {dc.supplierCount} supplier{dc.supplierCount !== 1 ? 's' : ''} ·{' '}
              {dc.supplierBreakdown
                .slice(0, 3)
                .map((s) => `${s.name.split('(')[0].trim()} ${s.volumeShare.toFixed(0)}%`)
                .join(', ')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const panelStyles = StyleSheet.create({
  container: {
    width: 280,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  containerNarrow: {
    width: 220,
    maxHeight: '55%',
  },
  scroll: {
    padding: space.md,
  },
  title: {
    ...type.title,
    marginBottom: space.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.lg,
  },
  bigScore: {
    ...type.hero,
  },
  scoreLabel: {
    ...type.body,
    color: color.textDim,
  },
  scoreSubLabel: {
    ...type.bodyDim,
    color: color.textFaint,
  },
  sectionTitle: {
    ...type.label,
    marginTop: space.md,
    marginBottom: space.sm,
    borderTopWidth: border.hair,
    borderTopColor: color.lineDim,
    paddingTop: space.md,
  },
  itemRow: {
    marginBottom: space.sm + 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  itemName: {
    ...type.body,
    fontWeight: '700',
    flex: 1,
    marginRight: space.sm,
  },
  itemDetail: {
    ...type.bodyDim,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: space.xs + 2,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: type.label.fontFamily,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: color.inverse,
  },
  barContainer: {
    ...surface.inset,
    height: 6,
  },
  bar: {
    height: '100%',
  },
  divScore: {
    fontFamily: type.value.fontFamily,
    fontSize: 14,
    fontWeight: '800',
  },
});

/** Memoized: the HUD re-renders on unrelated state changes. */
export const RiskPanel = React.memo(RiskPanelImpl);

export default RiskPanel;
