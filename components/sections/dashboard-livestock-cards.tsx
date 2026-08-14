"use client";

import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { DogRow, RabbitRow } from "@/lib/api-client";
import { formatAge, formatKES } from "@/lib/constants";
import { isFemale } from "./farm-composition";

const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";

function SectionLabel({ icon, children, count }: { icon: string; children: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-3 mt-8">
      <i className={`fas ${icon} text-accent`} />
      <h2 className="text-lg font-semibold">{children}</h2>
      <span className="text-muted text-sm">({count})</span>
    </div>
  );
}

/** Shared shell so a rabbit and a dog card cannot drift apart visually. */
function AnimalCard({
  name,
  breed,
  sex,
  femaleWord,
  maleWord,
  acquiredDate,
  source,
  price,
  extra,
}: {
  name: string;
  breed: string;
  sex: string;
  femaleWord: string;
  maleWord: string;
  acquiredDate: string;
  source: string;
  price: number;
  extra?: string | null;
}) {
  const female = isFemale(sex);
  return (
    <Card>
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-base font-semibold truncate" title={name}>
          {name}
        </h3>
        <Tag tone={female ? "success" : "neutral"}>{female ? femaleWord : maleWord}</Tag>
      </div>

      <div className="text-sm text-accent mt-1 truncate" title={breed}>
        {breed || "Unspecified breed"}
      </div>

      <div className="text-sm text-muted mt-2">
        {formatAge(acquiredDate)} old
        <span className="mx-1.5">·</span>
        {formatKES(price || 0)} KES
      </div>

      {extra ? <div className="text-[0.7rem] text-muted mt-1 truncate">{extra}</div> : null}

      <div className="text-[0.7rem] text-muted mt-2 truncate" title={source}>
        Source: {source || "—"}
      </div>
    </Card>
  );
}

export function RabbitCards({ rabbits }: { rabbits: RabbitRow[] }) {
  return (
    <>
      <SectionLabel icon="fa-rabbit" count={rabbits.length}>
        Rabbits
      </SectionLabel>
      {rabbits.length === 0 ? (
        <Card>
          <p className="text-muted text-center py-6">No rabbits registered yet.</p>
        </Card>
      ) : (
        <div className={GRID}>
          {rabbits.map((r) => (
            <AnimalCard
              key={r.id}
              name={r.tag_id}
              breed={r.breed}
              sex={r.sex}
              femaleWord="Doe"
              maleWord="Buck"
              acquiredDate={r.acquired_date}
              source={r.source}
              price={Number(r.price)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function DogCards({ dogs }: { dogs: DogRow[] }) {
  return (
    <>
      <SectionLabel icon="fa-dog" count={dogs.length}>
        Dogs
      </SectionLabel>
      {dogs.length === 0 ? (
        <Card>
          <p className="text-muted text-center py-6">No dogs registered yet.</p>
        </Card>
      ) : (
        <div className={GRID}>
          {dogs.map((d) => (
            <AnimalCard
              key={d.id}
              name={d.name}
              breed={d.breed}
              sex={d.sex}
              femaleWord="Bitch"
              maleWord="Dog"
              acquiredDate={d.acquired_date}
              source={d.source}
              price={Number(d.price)}
              extra={d.pedigree ? `Pedigree: ${d.pedigree}` : null}
            />
          ))}
        </div>
      )}
    </>
  );
}
