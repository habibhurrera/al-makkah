import { Card, CardBody } from '@/components/ui/card';
import { SettingsForm } from '@/components/admin/settings-form';
import { getSettingsForAdmin } from '@/server/queries/admin';

export const metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  const settings = await getSettingsForAdmin();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">Contact details</h1>
        <p className="text-text-muted">
          These appear in the footer and on every property page. There are no
          agent accounts, so all enquiries come to these numbers.
        </p>
      </div>

      <Card>
        <CardBody>
          <SettingsForm
            initial={{
              officeAddress: settings?.officeAddress ?? '',
              phone: settings?.phone ?? '',
              whatsapp: settings?.whatsapp ?? '',
              email: settings?.email ?? '',
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}
