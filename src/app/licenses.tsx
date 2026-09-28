import { LegalDocument } from '@/components/LegalDocument';
import { LICENSE_SECTIONS } from '@/legal/texts';

export default function LicensesScreen() {
  return <LegalDocument sections={LICENSE_SECTIONS} />;
}
