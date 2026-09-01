'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Card, CardBody } from '@/components/ui/card';
import { AREA_UNIT_LABEL, AREA_UNIT_ORDER } from '@/lib/units';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_FILES_PER_SUBMISSION,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/lib/storage';

type AreaOption = { id: string; name: string };
type FieldErrors = Record<string, string>;

const SELLABLE_TYPES = [
  'HOUSE',
  'PLOT',
  'BUNGALOW',
  'FLAT',
  'APARTMENT',
  'PORTION',
  'COMMERCIAL',
] as const;

const ACCEPT = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(',');

export function SellerForm({ areas }: { areas: AreaOption[] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<string>('HOUSE');

  // Plots have no rooms; asking for them just produces bad data.
  const showRooms = type !== 'PLOT';

  function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of picked) {
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      if (!isVideo && !isImage) {
        problems.push(`${file.name}: unsupported file type`);
        continue;
      }
      const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > cap) {
        problems.push(`${file.name}: over ${cap / 1_048_576} MB`);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length > MAX_FILES_PER_SUBMISSION) {
      problems.push(`Only the first ${MAX_FILES_PER_SUBMISSION} files will be sent`);
    }

    setFiles(accepted.slice(0, MAX_FILES_PER_SUBMISSION));
    setMessage(problems.length ? problems.join(' · ') : null);
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setMessage('Your browser cannot share a location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        setMessage('Could not get your location. You can still describe the address.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(formData: FormData) {
    setState('sending');
    setErrors({});
    setMessage(null);

    // The file input is not part of the form action payload, so attach the
    // validated selection explicitly.
    formData.delete('files');
    for (const file of files) formData.append('files', file);

    if (coords) {
      formData.set('latitude', String(coords.lat));
      formData.set('longitude', String(coords.lng));
    }

    try {
      const response = await fetch('/api/seller-submissions', {
        method: 'POST',
        body: formData,
      });
      const body = await response.json();

      if (!response.ok) {
        if (body.fieldErrors) setErrors(body.fieldErrors);
        setMessage(body.message ?? 'Something went wrong.');
        setState('error');
        return;
      }

      setReference(body.reference);
      if (body.filesAttempted > body.filesReceived) {
        setMessage(
          `${body.filesReceived} of ${body.filesAttempted} files uploaded. AL-MAKKAH will ask for the rest if needed.`,
        );
      }
      setState('sent');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setMessage('Could not reach the server. Check your connection and try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <Card>
        <CardBody className="flex flex-col gap-4">
          <h2 className="font-display text-2xl">Property submitted</h2>
          <p className="text-text-muted">
            Thank you. AL-MAKKAH has received your property and will review it.
            Your reference is <strong>{reference}</strong> — keep it for any
            follow-up.
          </p>
          <div className="flex flex-col gap-2 text-sm text-text-muted border-l-2 border-border pl-4">
            <p>What happens next:</p>
            <ol className="flex flex-col gap-1 list-decimal pl-4">
              <li>AL-MAKKAH reviews the details you sent</li>
              <li>Ownership, location and price are verified</li>
              <li>Once approved, your property is published on the site</li>
              <li>Buyer enquiries are passed on to you</li>
            </ol>
            <p className="pt-2">
              Your property is <strong>not public yet</strong>. Nothing appears
              on the website until AL-MAKKAH has verified it.
            </p>
          </div>
          {message && <p className="text-sm text-warning-500">{message}</p>}
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              setState('idle');
              setFiles([]);
              setCoords(null);
              setReference(null);
              setMessage(null);
            }}
          >
            Submit another property
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-10">
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="s-website">Website</label>
        <input id="s-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* ------------------------------------------------------ your details */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-display text-2xl mb-2">Your details</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="s-name" label="Your name" required error={errors.sellerName}>
            {(p) => (
              <Input {...p} name="sellerName" autoComplete="name" invalid={!!errors.sellerName} />
            )}
          </Field>
          <Field
            id="s-phone"
            label="Phone number"
            required
            hint="AL-MAKKAH will contact you on this number."
            error={errors.sellerPhone}
          >
            {(p) => (
              <Input
                {...p}
                name="sellerPhone"
                type="tel"
                inputMode="tel"
                placeholder="03xx xxxxxxx"
                autoComplete="tel"
                invalid={!!errors.sellerPhone}
              />
            )}
          </Field>
          <Field id="s-email" label="Email (optional)" error={errors.sellerEmail}>
            {(p) => (
              <Input {...p} name="sellerEmail" type="email" autoComplete="email" invalid={!!errors.sellerEmail} />
            )}
          </Field>
          <Field id="s-contact" label="Preferred contact method">
            {(p) => (
              <Select {...p} name="preferredContact" defaultValue="WHATSAPP">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Phone call</option>
                <option value="EMAIL">Email</option>
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      {/* -------------------------------------------------------- the property */}
      <fieldset className="flex flex-col gap-5">
        <legend className="font-display text-2xl mb-2">The property</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="s-type" label="Property type" required error={errors.type}>
            {(p) => (
              <Select
                {...p}
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {SELLABLE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {PROPERTY_TYPE_LABEL[option]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field id="s-purpose" label="I want to" required>
            {(p) => (
              <Select {...p} name="purpose" defaultValue="SALE">
                <option value="SALE">Sell this property</option>
                <option value="RENT">Rent it out</option>
              </Select>
            )}
          </Field>

          <Field id="s-area" label="Area" error={errors.areaId}>
            {(p) => (
              <Select {...p} name="areaId" defaultValue="">
                <option value="">Choose an area of Hyderabad</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="s-address"
            label="Street address (optional)"
            hint="Block, street or nearby landmark."
            error={errors.addressLine}
          >
            {(p) => <Input {...p} name="addressLine" invalid={!!errors.addressLine} />}
          </Field>

          <Field
            id="s-price"
            label="Expected price (PKR)"
            hint="Monthly rent if you are renting it out."
            error={errors.expectedPrice}
          >
            {(p) => (
              <Input
                {...p}
                name="expectedPrice"
                type="number"
                min={0}
                inputMode="numeric"
                invalid={!!errors.expectedPrice}
              />
            )}
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <Field id="s-size" label="Size" required error={errors.areaValue}>
              {(p) => (
                <Input
                  {...p}
                  name="areaValue"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  invalid={!!errors.areaValue}
                />
              )}
            </Field>
            <Field id="s-unit" label="Unit" required error={errors.areaUnit}>
              {(p) => (
                <Select {...p} name="areaUnit" defaultValue="SQ_YD" className="w-32">
                  {AREA_UNIT_ORDER.map((unit) => (
                    <option key={unit} value={unit}>
                      {AREA_UNIT_LABEL[unit]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {showRooms && (
            <>
              <Field id="s-beds" label="Bedrooms" error={errors.bedrooms}>
                {(p) => (
                  <Input {...p} name="bedrooms" type="number" min={0} max={50} inputMode="numeric" invalid={!!errors.bedrooms} />
                )}
              </Field>
              <Field id="s-baths" label="Bathrooms" error={errors.bathrooms}>
                {(p) => (
                  <Input {...p} name="bathrooms" type="number" min={0} max={50} inputMode="numeric" invalid={!!errors.bathrooms} />
                )}
              </Field>
              <Field id="s-floors" label="Floors" error={errors.floors}>
                {(p) => (
                  <Input {...p} name="floors" type="number" min={0} max={20} inputMode="numeric" invalid={!!errors.floors} />
                )}
              </Field>
            </>
          )}
        </div>

        <Field
          id="s-desc"
          label="Description"
          hint="Condition, nearby facilities, why someone would want it."
          error={errors.description}
        >
          {(p) => <Textarea {...p} name="description" rows={5} invalid={!!errors.description} />}
        </Field>
      </fieldset>

      {/* ------------------------------------------------------------ location */}
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl mb-2">Location</legend>
        <p className="text-sm text-text-muted max-w-[var(--measure)]">
          Sharing the exact location helps AL-MAKKAH verify the property faster.
          It is optional, and it is never shown publicly until the listing is
          approved.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={useMyLocation} aria-busy={locating}>
            {locating ? 'Getting location…' : 'Use my current location'}
          </Button>
          {coords && (
            <span className="text-sm text-success-500">
              Location captured ({coords.lat}, {coords.lng})
            </span>
          )}
        </div>
      </fieldset>

      {/* -------------------------------------------------------- photos/video */}
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display text-2xl mb-2">Photos and video</legend>
        <p className="text-sm text-text-muted max-w-[var(--measure)]">
          Up to {MAX_FILES_PER_SUBMISSION} files. Photos up to{' '}
          {MAX_IMAGE_BYTES / 1_048_576} MB each, video up to{' '}
          {MAX_VIDEO_BYTES / 1_048_576} MB. Listings with clear photos sell
          considerably faster.
        </p>
        <input
          type="file"
          name="files"
          multiple
          accept={ACCEPT}
          onChange={onFilesChange}
          className="block w-full text-sm file:mr-4 file:h-11 file:rounded-md file:border-0 file:bg-accent file:px-5 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent-hover"
        />
        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((file) => (
              <li key={file.name} className="text-sm text-text-muted">
                {file.name} — {(file.size / 1_048_576).toFixed(1)} MB
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {message && (
        <p role="alert" className="text-sm text-danger-500">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" className="self-start" aria-busy={state === 'sending'} disabled={state === 'sending'}>
          {state === 'sending' ? 'Submitting…' : 'Submit property'}
        </Button>
        <p className="text-sm text-text-subtle max-w-[var(--measure)]">
          Submitting does not publish your property. AL-MAKKAH reviews and
          verifies every listing before it appears on the website.
        </p>
      </div>
    </form>
  );
}
