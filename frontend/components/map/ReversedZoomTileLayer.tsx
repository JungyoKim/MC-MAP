"use client";

import {
  createElementObject,
  createTileLayerComponent,
  updateGridLayer,
  withPane,
} from "@react-leaflet/core";
import L, { DomEvent, DomUtil, TileLayer as LeafletTileLayer } from "leaflet";
import type { Coords, DoneCallback } from "leaflet";
import type { TileLayerProps } from "react-leaflet";

type TileInternals = {
  _tileZoom: number;
  _tileOnLoad: (done: DoneCallback, tile: HTMLImageElement) => void;
  _tileOnError: (
    done: DoneCallback,
    tile: HTMLImageElement,
    err: Error,
  ) => void;
};

/**
 * Pl3xMap 역순 줌 타일 레이어.
 * 표준 Leaflet과 달리 타일 z가 반대(0=최대 디테일, maxOut=최대 줌아웃)라
 * URL용 zoom을 (maxZoom - zoom) + zoomOffset 으로 뒤집는다.
 * 근거: reference/Pl3xMap/webmap ReversedZoomTileLayer.ts (SPEC.md)
 */
export class ReversedZoomLayer extends LeafletTileLayer {
  _getZoomForUrl(): number {
    const zoom = (this as unknown as TileInternals)._tileZoom;
    const maxZoom = this.options.maxZoom!;
    const offset = this.options.zoomOffset!;
    return maxZoom - zoom + offset;
  }

  /**
   * createTile 오버라이드: img.src 직접 지정 대신 fetch() 로 가져온다.
   * 브라우저는 이미 로드한 동일 URL 이미지를 src 재지정만으로는 다시 요청하지 않고
   * 메모리 캐시에서 내준다(no-cache 헤더가 있어도). near-real-time 갱신(redraw)에서
   * 변경된 타일을 받아오려면 fetch 로 조건부 요청을 강제해야 한다.
   * 근거: reference/Pl3xMap/webmap ReversedZoomTileLayer.ts createTile()
   */
  createTile(coords: Coords, done: DoneCallback): HTMLImageElement {
    const internals = this as unknown as TileInternals;
    const tile = DomUtil.create("img") as HTMLImageElement;

    DomEvent.on(tile, "load", () => {
      if (tile.src.startsWith("blob:")) URL.revokeObjectURL(tile.src);
      internals._tileOnLoad(done, tile);
    });
    DomEvent.on(
      tile,
      "error",
      L.Util.bind(internals._tileOnError, this, done, tile),
    );

    if (this.options.crossOrigin || this.options.crossOrigin === "") {
      tile.crossOrigin =
        this.options.crossOrigin === true ? "" : this.options.crossOrigin;
    }
    tile.alt = "";
    tile.setAttribute("role", "presentation");

    // src 직접 지정이 아니라 fetch → blob → data URL 로 우회.
    // 동일 URL 재요청을 강제해 갱신된 타일을 받아온다(캐시는 fetch 가 헤더대로 처리).
    fetch(this.getTileUrl(coords))
      .then((res) => {
        if (!res.ok) {
          internals._tileOnError(done, tile, new Error(res.statusText));
          return;
        }
        return res.blob().then((blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onload = () => {
            tile.src = String(reader.result);
          };
        });
      })
      .catch((e: Error) => internals._tileOnError(done, tile, e));

    return tile;
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
