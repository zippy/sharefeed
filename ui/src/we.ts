/**
 * Weave/Moss applet services for ShareFeed.
 * Provides integration with the Moss framework.
 */

import type {
  AppletHash,
  AppletServices,
  AssetInfo,
  RecordInfo,
  WAL,
  WeaveServices,
} from '@theweave/api';
import type { AppClient } from '@holochain/client';

export const ROLE_NAME = 'sharefeed';

/**
 * Applet services configuration for Moss integration.
 * Minimal implementation - can be extended for asset previews, search, etc.
 */
export const appletServices: AppletServices = {
  // Types of attachment that this Applet offers for other Applets to create
  creatables: {},

  // Types of UI widgets/blocks that this Applet supports
  blockTypes: {},

  // Get info about an asset for display in Moss
  getAssetInfo: async (
    _appletClient: AppClient,
    _wal: WAL,
    _recordInfo?: RecordInfo
  ): Promise<AssetInfo | undefined> => {
    // For now, return undefined - can be extended to show share previews
    return undefined;
  },

  // Search within this applet
  search: async (
    _appletClient: AppClient,
    _appletHash: AppletHash,
    _weServices: WeaveServices,
    _searchFilter: string
  ): Promise<Array<WAL>> => {
    // For now, return empty - can be extended to search shares
    return [];
  },
};
