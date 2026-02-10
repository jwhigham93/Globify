/**
 * Risk Summary Panel Component
 *
 * Displays concentration risk metrics when the risk view mode is active.
 * Shows network diversification score, supplier risk rankings, and DC diversification.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import type { NetworkRiskMetrics } from './types';

const NARROW_BREAKPOINT = 600;

export interface RiskPanelProps {
  metrics: NetworkRiskMetrics;
  visible: boolean;
}

/**
 * Get color for a risk score value
 */
function getRiskColor(score: number): string {
  if (score >= 35) return '#CC0000';
  if (score >= 20) return '#CCCC00';
  return '#00CC00';
}

/**
 * Get color for a diversification score (inverted from risk)
 */
function getDiversificationColor(score: number): string {
  if (score >= 70) return '#00CC00';
  if (score >= 30) return '#CCCC00';
  return '#CC0000';
}

/**
 * Risk level badge
 */
const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
  const color =
    level === 'high' ? '#CC0000' : level === 'medium' ? '#CCCC00' : '#00CC00';
  return (
    <View style={[panelStyles.badge, { backgroundColor: color + '33' }]}>
      <Text style={[panelStyles.badgeText, { color }]}>
        {level.toUpperCase()}
      </Text>
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
  const color = getRiskColor(score);
  return (
    <View style={panelStyles.barContainer}>
      <View style={[panelStyles.bar, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
};

export const RiskPanel: React.FC<RiskPanelProps> = ({ metrics, visible }) => {
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < NARROW_BREAKPOINT;

  if (!visible) return null;

  return (
    <View style={isNarrow ? panelStyles.containerNarrow : panelStyles.container}>
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
    position: 'absolute',
    top: 20,
    right: 20,
    width: 280,
    maxHeight: '80%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  containerNarrow: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 220,
    maxHeight: '55%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  scroll: {
    padding: 14,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bigScore: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  scoreSubLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
  sectionTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  itemRow: {
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  itemDetail: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
  divScore: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RiskPanel;
