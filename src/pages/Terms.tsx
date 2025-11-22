export const Terms = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: November 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ThreadsDash ("Service"), you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">2. Description of Service</h2>
            <p>
              ThreadsDash is a social media management tool that allows users to schedule posts, 
              manage multiple accounts, and view analytics for their Threads accounts. The Service 
              integrates with Meta's Threads API to provide these features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">3. Account Registration</h2>
            <p>To use the Service, you must:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Create an account with accurate and complete information</li>
              <li>Be at least 13 years of age</li>
              <li>Keep your account credentials secure</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Threads Account Connection</h2>
            <p>
              When you connect your Threads account to our Service, you authorize us to access 
              and interact with your Threads account on your behalf. This includes:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Reading your profile information</li>
              <li>Creating and publishing posts</li>
              <li>Accessing post insights and analytics</li>
              <li>Managing replies to your posts</li>
            </ul>
            <p className="mt-3">
              You can revoke this access at any time by disconnecting your Threads account 
              from our Service or through your Threads settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">5. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Violate Meta's Terms of Service or Community Guidelines</li>
              <li>Post spam, misleading, or harmful content</li>
              <li>Attempt to circumvent any rate limits or restrictions</li>
              <li>Access accounts you do not own or have authorization to manage</li>
              <li>Interfere with or disrupt the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">6. Content Responsibility</h2>
            <p>
              You are solely responsible for all content you post through our Service. We do not 
              review, approve, or endorse any content posted by users. You retain ownership of 
              your content but grant us a license to use it as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">7. Service Availability</h2>
            <p>
              We strive to provide reliable service but do not guarantee uninterrupted access. 
              The Service depends on third-party APIs (including Meta's Threads API) which may 
              experience downtime or changes beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, ThreadsDash shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including 
              loss of profits, data, or other intangible losses resulting from:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Your use or inability to use the Service</li>
              <li>Any unauthorized access to your account</li>
              <li>Any content posted through the Service</li>
              <li>Any third-party services or APIs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for 
              violations of these Terms or for any other reason. You may also delete your 
              account at any time through the Service settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">10. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the Service after 
              changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:{' '}
              <a href="mailto:aderyolo@gmail.com" className="text-primary hover:underline">
                aderyolo@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t">
          <a href="/" className="text-primary hover:underline">
            ← Back to ThreadsDash
          </a>
        </div>
      </div>
    </div>
  );
};
