"use client";

import {
  createElementObject,
  createTileLayerComponent,
  updateGridLayer,
  withPane,
} from "@react-leaflet/core";
import { TileLayer as LeafletTileLayer } from "leaflet";
import type { TileLayerProps } from "react-leaflet";

/**
 * Pl3xMap 역순 줌 타일 레이어.
 * 표준 Leaflet과 달리 타일 z가 반대(0=최대 디테일, maxOut=최대 줌아웃)라
 * URL용 zoom을 (maxZoom - zoom) + zoomOffset 으로 뒤집는다.
 * 근거: reference/Pl3xMap/webmap ReversedZoomTileLayer.ts (SPEC.md)
 */
class ReversedZoomLayer extends LeafletTileLayer {
  _getZoomForUrl(): number {
    const zoom = (this as unknown as { _tileZoom: number })._tileZoom;
    const maxZoom = this.options.maxZoom!;
    const offset = this.options.zoomOffset!;
    return maxZoom - zoom + offset;
  }
}

export const ReversedZoomTileLayer = createTileLayerComponent<
  ReversedZoomLayer,
  TileLayerProps
>(
  function createTileLayer({ url, ...options }, context) {
    const layer = new ReversedZoomLayer(url, withPane(options, context));
    return createElementObject(layer, context);
  },
  function updateTileLayer(layer, props, prevProps) {
    updateGridLayer(layer, props, prevProps);
    const { url } = props;
    if (url != null && url !== prevProps.url) {
      layer.setUrl(url);
    }
  },
);
