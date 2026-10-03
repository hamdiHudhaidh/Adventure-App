"use client";

import type { Adventure, Delivery, Recap } from "@/lib/data/types";
import { cutDuration, formatSeconds } from "@/lib/recap";
import Panel from "../hud/Panel";
import { IconPlay } from "../hud/icons";
import MediaView from "../photos/MediaView";

/** Player inbox of recap films delivered by the admin. */
export default function FilmsPanel({
  deliveries,
  adventures,
  recaps,
  onWatch,
  onClose,
}: {
  deliveries: Delivery[];
  adventures: Adventure[];
  recaps: Recap[];
  onWatch: (d: Delivery) => void;
  onClose: () => void;
}) {
  return (
    <Panel title="Films" kicker={`${deliveries.length} recap film${deliveries.length === 1 ? "" : "s"}`} onClose={onClose}>
      {!deliveries.length ? (
        <div className="hud-empty">No films yet. When an adventure ends, the game master releases its recap here.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...deliveries].reverse().map((d) => {
            const a = adventures.find((x) => x.id === d.adventureId);
            const film = recaps.find((r) => r.adventureId === d.adventureId)?.released;
            if (!a || !film) return null;
            return (
              <li key={d.id}>
                <button type="button" className="film-card" style={{ ["--adv" as string]: a.look.color }} onClick={() => onWatch(d)}>
                  <span className="film-card-media">
                    {film.clips[0] ? <MediaView media={film.clips[0].media} alt="" className="film-card-img" /> : null}
                    <span className="film-card-play">
                      <IconPlay size={22} />
                    </span>
                    {!d.seenAt ? <span className="film-card-new">New</span> : null}
                  </span>
                  <span className="film-card-body">
                    <span className="adv-card-name">{film.title}</span>
                    <span className="text-xs text-zinc-400">
                      {film.subtitle} · {formatSeconds(cutDuration(film))} · v{film.version}
                    </span>
                    <span className="text-xs text-zinc-500">
                      From {film.releasedBy} · {new Date(d.deliveredAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
