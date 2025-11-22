export const Privacy = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: November 22, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h2>
            <p>
              ThreadsDash ("we", "our", or "us") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and share information about you 
              when you use our social media management application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">2. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Account Information:</strong> When you create an account, we collect your 
                email address and password.
              </li>
              <li>
                <strong>Threads Account Data:</strong> When you connect your Threads account, we 
                receive access tokens that allow us to post on your behalf. We also access your 
                Threads profile information, posts, and analytics data.
              </li>
              <li>
                <strong>Content You Create:</strong> Posts, media, and other content you create 
                within our application.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you use our application, 
                including features accessed and actions taken.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Post content to Threads on your behalf at your direction</li>
              <li>Display analytics about your Threads account</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">4. Information Sharing</h2>
            <p>
              We do not sell your personal information. We share information only in the 
              following circumstances:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in operating our application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your 
              personal information. Access tokens are stored securely and encrypted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">6. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed 
              to provide services. You can request deletion of your data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Disconnect your Threads account at any time</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">8. Third-Party Services</h2>
            <p>
              Our application integrates with Meta's Threads API. Your use of Threads is 
              subject to Meta's Privacy Policy and Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of 
              any changes by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-6 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{' '}
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
