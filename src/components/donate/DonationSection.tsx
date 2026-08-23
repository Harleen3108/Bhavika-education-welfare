import { HeartHandshake } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Hi } from "@/components/ui/Bilingual";
import { DonateForm } from "@/components/donate/DonateForm";
import { listActiveCategories } from "@/server/services/donation.service";

/**
 * The "Donate" band that sits directly below the hero. Server-rendered so the
 * causes come straight from the database; the form itself is a client island
 * that drives the Razorpay checkout.
 */
export async function DonationSection() {
  const causes = await listActiveCategories();

  return (
    <section id="donate" className="bg-cream-50 py-14 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <HeartHandshake size={16} /> Support our work
          </span>
          <h2 className="mt-4 text-3xl font-bold text-ink-900 sm:text-4xl">Make a donation</h2>
          <Hi className="mt-1 block text-lg text-brand-700">दान करें</Hi>
          <p className="mt-3 text-ink-600">
            Every contribution funds a child&apos;s education, a meal, or a family&apos;s dignity. You
            don&apos;t need an account — just give, and your receipt reaches your inbox instantly.
          </p>
          <Hi className="mt-1 block text-ink-600">
            आपका हर योगदान किसी बच्चे की शिक्षा, भोजन या परिवार का सहारा बनता है। खाता ज़रूरी नहीं —
            बस दान करें, रसीद तुरंत आपके ईमेल पर।
          </Hi>
        </div>

        <div className="mx-auto mt-8 max-w-2xl">
          <Card>
            <CardBody className="sm:p-7">
              {causes.length === 0 ? (
                <p className="py-8 text-center text-ink-500">
                  Donations are opening soon. Please check back shortly.
                </p>
              ) : (
                <DonateForm causes={causes} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
