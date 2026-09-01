'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { createProperty, updateProperty } from '@/server/actions/property';
import { AREA_UNIT_LABEL, AREA_UNIT_ORDER } from '@/lib/units';
import { PROPERTY_TYPE_LABEL } from '@/types/property';
import type { ActionResult } from '@/server/actions/admin';

type State = (ActionResult & { fieldErrors?: Record<string, string> }) | null;

export type EditableProperty = {
  id: string;
  refNo: string;
  slug: string;
  title: string;
  description: string;
  purpose: string;
  type: string;
  price: number;
  areaValue: number;
  areaUnit: string;
  areaId: string;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floors: number | null;
  parking: number | null;
  yearBuilt: number | null;
  furnishing: string | null;
  facing: string | null;
  hasElectricity: boolean;
  hasGas: boolean;
  hasWater: boolean;
  hasSecurity: boolean;
  amenityIds: string[];
};

const TYPES = [
  'HOUSE',
  'PLOT',
  'BUNGALOW',
  'FLAT',
  'APARTMENT',
  'PORTION',
  'COMMERCIAL',
] as const;

/**
 * One form for both jobs.
 *
 * Creating and editing take the same fields, so they share a component - two
 * near-identical forms would inevitably drift apart, and a field added to one
 * but not the other is the kind of bug nobody notices for months.
 */
export function PropertyEditForm({
  property,
  areas,
  amenities,
  mode = 'edit',
}: {
  property: EditableProperty;
  areas: { id: string; name: string }[];
  amenities: { id: string; name: string }[];
  mode?: 'create' | 'edit';
}) {
  const isCreate = mode === 'create';
  const [state, action, pending] = useActionState<State, FormData>(
    isCreate ? createProperty : updateProperty,
    null,
  );
  const [type, setType] = useState(property.type);
  const errors = state?.fieldErrors ?? {};
  const showRooms = type !== 'PLOT';

  return (
    <form action={action} className="flex flex-col gap-8">
      {!isCreate && <input type="hidden" name="propertyId" value={property.id} />}

      {state && (
        <p
          role="status"
          className={`text-sm ${state.ok ? 'text-success-500' : 'text-danger-500'}`}
        >
          {state.message}
        </p>
      )}

      <Card>
        <CardBody className="flex flex-col gap-5">
          <h2 className="font-display text-xl">Listing</h2>

          <Field id="e-title" label="Title" required error={errors.title}>
            {(p) => (
              <Input {...p} name="title" defaultValue={property.title} invalid={!!errors.title} />
            )}
          </Field>

          <Field
            id="e-desc"
            label="Description"
            required
            error={errors.description}
          >
            {(p) => (
              <Textarea
                {...p}
                name="description"
                rows={6}
                defaultValue={property.description}
                invalid={!!errors.description}
              />
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="e-purpose" label="Purpose" required>
              {(p) => (
                <Select {...p} name="purpose" defaultValue={property.purpose}>
                  <option value="SALE">For sale</option>
                  <option value="RENT">For rent</option>
                </Select>
              )}
            </Field>

            <Field id="e-type" label="Property type" required>
              {(p) => (
                <Select
                  {...p}
                  name="type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {TYPES.map((option) => (
                    <option key={option} value={option}>
                      {PROPERTY_TYPE_LABEL[option]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              id="e-price"
              label="Price (PKR)"
              hint={property.purpose === 'RENT' ? 'Monthly rent.' : undefined}
              required
              error={errors.price}
            >
              {(p) => (
                <Input
                  {...p}
                  name="price"
                  type="number"
                  min={0}
                  defaultValue={property.price}
                  invalid={!!errors.price}
                />
              )}
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <Field id="e-size" label="Size" required error={errors.areaValue}>
                {(p) => (
                  <Input
                    {...p}
                    name="areaValue"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={property.areaValue}
                    invalid={!!errors.areaValue}
                  />
                )}
              </Field>
              <Field id="e-unit" label="Unit" required>
                {(p) => (
                  <Select
                    {...p}
                    name="areaUnit"
                    defaultValue={property.areaUnit}
                    className="w-32"
                  >
                    {AREA_UNIT_ORDER.map((unit) => (
                      <option key={unit} value={unit}>
                        {AREA_UNIT_LABEL[unit]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <h2 className="font-display text-xl">Location</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="e-area" label="Area" required error={errors.areaId}>
              {(p) => (
                <Select {...p} name="areaId" defaultValue={property.areaId}>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field id="e-address" label="Street address" error={errors.addressLine}>
              {(p) => (
                <Input
                  {...p}
                  name="addressLine"
                  defaultValue={property.addressLine ?? ''}
                  invalid={!!errors.addressLine}
                />
              )}
            </Field>
            <Field id="e-lat" label="Latitude" error={errors.latitude}>
              {(p) => (
                <Input
                  {...p}
                  name="latitude"
                  type="number"
                  step="any"
                  defaultValue={property.latitude ?? ''}
                  invalid={!!errors.latitude}
                />
              )}
            </Field>
            <Field id="e-lng" label="Longitude" error={errors.longitude}>
              {(p) => (
                <Input
                  {...p}
                  name="longitude"
                  type="number"
                  step="any"
                  defaultValue={property.longitude ?? ''}
                  invalid={!!errors.longitude}
                />
              )}
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <h2 className="font-display text-xl">Specifications</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {showRooms && (
              <>
                <Field id="e-beds" label="Bedrooms" error={errors.bedrooms}>
                  {(p) => (
                    <Input {...p} name="bedrooms" type="number" min={0} defaultValue={property.bedrooms ?? ''} />
                  )}
                </Field>
                <Field id="e-baths" label="Bathrooms" error={errors.bathrooms}>
                  {(p) => (
                    <Input {...p} name="bathrooms" type="number" min={0} defaultValue={property.bathrooms ?? ''} />
                  )}
                </Field>
                <Field id="e-floors" label="Floors" error={errors.floors}>
                  {(p) => (
                    <Input {...p} name="floors" type="number" min={0} defaultValue={property.floors ?? ''} />
                  )}
                </Field>
              </>
            )}
            <Field id="e-parking" label="Parking spaces" error={errors.parking}>
              {(p) => (
                <Input {...p} name="parking" type="number" min={0} defaultValue={property.parking ?? ''} />
              )}
            </Field>
            <Field id="e-year" label="Year built" error={errors.yearBuilt}>
              {(p) => (
                <Input {...p} name="yearBuilt" type="number" defaultValue={property.yearBuilt ?? ''} />
              )}
            </Field>
            <Field id="e-facing" label="Facing" error={errors.facing}>
              {(p) => (
                <Input {...p} name="facing" placeholder="e.g. North" defaultValue={property.facing ?? ''} />
              )}
            </Field>
            {showRooms && (
              <Field id="e-furnishing" label="Furnishing">
                {(p) => (
                  <Select {...p} name="furnishing" defaultValue={property.furnishing ?? ''}>
                    <option value="">Not specified</option>
                    <option value="UNFURNISHED">Unfurnished</option>
                    <option value="SEMI_FURNISHED">Semi-furnished</option>
                    <option value="FURNISHED">Furnished</option>
                  </Select>
                )}
              </Field>
            )}
          </div>

          <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
            <legend className="text-sm font-medium mb-2">Utilities</legend>
            {(
              [
                ['hasElectricity', 'Electricity', property.hasElectricity],
                ['hasGas', 'Gas', property.hasGas],
                ['hasWater', 'Water', property.hasWater],
                ['hasSecurity', 'Security', property.hasSecurity],
              ] as const
            ).map(([name, label, checked]) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={name}
                  value="true"
                  defaultChecked={checked}
                  className="size-4"
                />
                {label}
              </label>
            ))}
          </fieldset>
        </CardBody>
      </Card>

      {amenities.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <h2 className="font-display text-xl">Amenities</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {amenities.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="amenityIds"
                    value={amenity.id}
                    defaultChecked={property.amenityIds.includes(amenity.id)}
                    className="size-4"
                  />
                  {amenity.name}
                </label>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" aria-busy={pending} disabled={pending}>
          {pending
            ? isCreate
              ? 'Creating…'
              : 'Saving…'
            : isCreate
              ? 'Create listing and add photos'
              : 'Save changes'}
        </Button>
        <Link
          href="/admin/properties"
          className="text-sm text-text-muted hover:text-text underline underline-offset-4"
        >
          Back to properties
        </Link>
        <p className="text-sm text-text-subtle w-full">
          {isCreate
            ? 'The listing is created as a draft and is not public. You will be taken straight to the photo page next, then publish it from Properties when it is ready.'
            : `Reference ${property.refNo} and the web address stay the same — changing the address would break links already shared with buyers. Publishing and verification are handled separately on the Properties page.`}
        </p>
      </div>
    </form>
  );
}
