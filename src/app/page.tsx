import { fetchCalendarYearData } from "@/lib/data-source";
import { getCurrentIdentityId } from "@/lib/identity";
import { isGatePassed } from "@/lib/gate";
import { IdentityOnboarding } from "@/components/IdentityOnboarding";
import { PinGate } from "@/components/PinGate";
import { CalendarShell } from "@/components/CalendarShell";
import { siteFooterText, siteName, siteRepoUrl } from "@/lib/site";
import { getPaymentConfig } from "@/lib/payment";
import { isMaryId } from "@/lib/mary";

function parseMonthParam(value: string | string[] | undefined): [number, number] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, mo] = raw.split("-").map(Number);
    if (mo >= 1 && mo <= 12) return [y, mo - 1];
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth()];
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ m?: string | string[] }>;
}) {
  const { m } = await searchParams;
  const [year, month] = parseMonthParam(m);

  if (!(await isGatePassed())) {
    return <PinGate siteName={siteName} />;
  }

  const { people, bookings, today } = await fetchCalendarYearData(year);
  const identityId = await getCurrentIdentityId();
  const me = identityId ? people.find((p) => p.id === identityId) : undefined;
  const paymentConfig = getPaymentConfig();

  if (!me) {
    return <IdentityOnboarding people={people} siteName={siteName} />;
  }

  return (
    <CalendarShell
      key={`calendar-shell-${year}`}
      initialYear={year}
      initialMonth={month}
      loadedYear={year}
      bookings={bookings}
      people={people}
      me={me}
      today={today}
      paymentConfig={paymentConfig}
      showMaryMode={isMaryId(me.id)}
      footerText={siteFooterText}
      siteRepoUrl={siteRepoUrl}
    />
  );
}
