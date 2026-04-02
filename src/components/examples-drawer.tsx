"use client";

import { useState } from "react";
import { Copy, X, ChevronRight, Check } from "lucide-react";

// Example scripts embedded as constants
const EXAMPLES = [
  {
    id: "example1",
    title: "ACME Bank — Voice Agent API",
    description: "Customer support overhaul with xAI Voice Agent API",
    content: `Transcript 1: ACME Bank – Overhauling Customer Support with xAI Voice Agent API
Discovery Call Recording
Simulated Date: March 2026
Duration: ~52 minutes
Participants: Alex Rivera (Senior Enterprise Sales Engineer, xAI) and Sarah Chen (VP Customer Experience, ACME Bank)
[00:00] Alex Rivera (xAI): Hi Sarah, Alex Rivera from xAI. Thanks for making the time today. To get us started, could you give me the high-level overview of your current customer support operations at ACME Bank, particularly where voice fits into the omnichannel mix and what major initiatives you're focused on this year?
[00:55] Sarah Chen (VP Customer Experience, ACME Bank): Sure, Alex. ACME Bank manages $1.2 trillion in assets and serves 15.7 million customers. Voice is still our dominant channel — we handle approximately 1.18 million inbound voice interactions per month, representing about 62% of total support volume. We run a complex hybrid contact center environment: the majority sits on Genesys Cloud CX hosted in AWS us-east-1, but we maintain a significant on-premises Avaya Aura 8.1 deployment for high-net-worth private banking and wealth management clients due to strict data residency and security policies. We also leverage Five9 for overflow routing and after-hours coverage.
Upstream, calls arrive through 18 different toll-free numbers plus in-app callbacks from our mobile banking app. The IVR layer uses Genesys Voice Platform combined with legacy Nuance speech recognition. Authentication is multi-factor: device fingerprint + account number/PIN or voice biometrics (we piloted NICE Real-time Authentication but only hit 68% success rate on production traffic). Once authenticated, customer data is pulled in real-time from our core banking system — FIS Profile running on IBM z15 mainframe with DB2 databases. Intent classification is still 70% rules-based with limited ML augmentation through a custom Google Dialogflow CX model. We see massive volume spikes on Mondays and after major market events.
[03:40] Alex Rivera (xAI): That's very helpful context on the hybrid architecture. Can you walk me through the agent experience once a call is routed? What systems do they actually use during live conversations?
[04:25] Sarah Chen: The agent desktop experience is quite fragmented, which is one of our biggest pain points. The primary interface is Salesforce Service Cloud Enterprise with a custom Genesys Open CTI integration for screen pops. But agents routinely toggle between seven different systems during a single call: FIS core banking via IBM MQSeries middleware, FICO Falcon fraud engine, TSYS card management, ServiceNow knowledge base, a separate Reg E compliance logging tool, our internal wire transfer system, and occasionally the legacy AS/400 for older loan products.
Context switching is brutal. Average handle time sits at 9.4 minutes (retail banking 7.8 min, wealth management 14.2 min). We currently employ 2,450 agents across four U.S. centers and one large nearshore operation in Mexico. We have specialized queues for fraud disputes, wires, and high-net-worth relationship banking. Screen pop latency sometimes hits 2.8 seconds during peak load, which frustrates both agents and customers.
[07:10] Alex Rivera (xAI): I can see how that creates real friction. How do you handle escalations and complex cases that require multiple departments or back-office involvement?
[08:05] Sarah Chen: Escalations happen on roughly 18% of calls. We use Genesys Workforce Management routing rules, but warm transfers often require the original agent to stay on the line while conferencing in specialists. For non-real-time escalations, we create Salesforce cases that trigger email and Slack notifications to back-office teams. The back office itself runs on a mix of mainframe batch jobs and some newer Java Spring Boot microservices deployed on Azure Kubernetes Service. Handoffs frequently result in duplicated effort and data entry errors. Our repeat call rate within 48 hours is currently 14.7%, and first-contact resolution sits at 71%.
[10:30] Alex Rivera (xAI): Understood. Let's shift to post-call processes. What happens to recordings, transcripts, metadata, and outcomes once the call ends?
[11:15] Sarah Chen: Post-call processing is sophisticated but operationally heavy. Every call is recorded and stored via NICE CXone with immutable storage in AWS S3 for seven years to meet regulatory retention. We run a real-time streaming pipeline using Apache Kafka with multiple topics: call-metadata, transcripts, disposition-codes, fraud-events, and compliance-audit. Transcripts are generated using Speechmatics as primary with Amazon Transcribe fallback and a fine-tuned Whisper model trained on banking jargon.
This data feeds into a multi-stage ETL/ELT pipeline orchestrated by Apache Airflow running on Amazon EKS. Fivetran handles initial extraction from Genesys and Salesforce, Spark jobs on EMR perform PII redaction using custom regex + NER models, followed by dbt transformations in Snowflake. The final modeled data lands in our enterprise data warehouse and is consumed by Tableau for VoC dashboards, Databricks for churn propensity and next-best-action ML models, and automated regulatory feeds for the OCC and CFPB. We process 48–62 TB of call-related data monthly. Latency ranges from 45 minutes for priority streams to 14 hours for full reconciliation batches. Error handling includes dead-letter queues and automated reprocessing with detailed audit logs.
[16:40] Alex Rivera (xAI): Extremely detailed — thank you. How do real-time fraud and risk checks work during the call, and what compliance processes are layered on top?
[17:30] Sarah Chen: During the call, we make synchronous calls to FICO Falcon through a dedicated low-latency API gateway. High-risk actions trigger an agent whisper and potential call hold. Post-call, high-value interactions undergo mandatory compliance review — currently 6.2% manual sampling plus rules-based automation. We maintain full chain-of-custody for every recording and transcript under FINRA, GLBA, PCI-DSS, and CFPB rules. All data must remain in U.S. regions. We also run quarterly SOC2 and PCI audits that require extensive documentation from every system involved.
[20:15] Alex Rivera (xAI): How are knowledge bases managed today, and what challenges do agents face when searching for information mid-call?
[21:05] Sarah Chen: Knowledge is scattered across Salesforce Knowledge, ServiceNow, and an aging internal Confluence wiki. Agents lose significant time searching — we estimate 90–120 seconds per complex call. We attempted to unify this with a custom semantic search layer using Elasticsearch, but accuracy remains inconsistent, especially for regulatory nuances.
[23:40] Alex Rivera (xAI): Can you share more about your current AI and chatbot initiatives and why they haven't fully reduced voice volume?
[24:30] Sarah Chen: We have basic Einstein bots in Salesforce and a Dialogflow CX voice bot, but they only handle 22% of interactions successfully. They struggle with context carryover, complex banking products, and regulatory language. Customers frequently get frustrated and request human escalation, which actually increases overall handle time due to context loss.
[27:10] Alex Rivera (xAI): What does monitoring, alerting, and scaling look like for these systems during peak periods?
[28:00] Sarah Chen: We use Datadog for infrastructure monitoring, New Relic for application performance, and Prometheus/Grafana for custom metrics. Peak Monday mornings can hit 78,000 calls. Auto-scaling in Genesys Cloud works reasonably well, but our mainframe backend and MQ middleware become bottlenecks. We still maintain a 24/7 command center with 12 dedicated operations staff.
[31:20] Alex Rivera (xAI): Finally, could you give me a sense of the total cost structure and headcount supporting this entire platform?
[32:05] Sarah Chen: Annual spend exceeds $87 million — licensing, infrastructure, headcount, and compliance overhead. We have 2,450 agents, 180 supervisors, 45 people in our contact center technology and analytics team, plus external consulting for regulatory audits. Technical debt from the hybrid setup is costing us significantly in maintenance and talent acquisition.
[35:40] Alex Rivera (xAI): Sarah, I've captured an extremely comprehensive picture of your current state — the hybrid Genesys/Avaya IVR and ACD, multi-system agent desktop with heavy context switching, sophisticated Kafka + Airflow + Spark + Snowflake post-call pipeline, strict compliance and data residency requirements, current AHT/CSAT metrics, and the limitations of your existing AI attempts. xAI's Voice Agent API is specifically engineered for secure, real-time tool calling against core systems like FIS while preserving full auditability. Would you be open to a technical architecture workshop next week and potentially a targeted POC on one of your highest-volume queues?
[39:15] Sarah Chen: Yes, that makes a lot of sense. Let's get that scheduled.`,
  },
  {
    id: "example2",
    title: "QuickBite — X Sentiment Signals",
    description: "Restaurant chain forecasting with X sentiment",
    content: `QuickBite Restaurant Chain – Integrating X Sentiment Signals into Prediction/Forecasting Pipelines
Discovery Call Recording
Simulated Date: March 2026
Duration: ~49 minutes
Participants: Alex Rivera (Senior Enterprise Sales Engineer, xAI) and Marcus Lee (Director of Data Science & Analytics, QuickBite)
[00:00] Alex Rivera (xAI): Hi Marcus, Alex Rivera from xAI. Thanks for joining. I understand you're looking at ways to strengthen your forecasting accuracy with better external signals. Could you start by walking me through your current demand, inventory, and labor forecasting processes?
[00:50] Marcus Lee (Director of Data Science & Analytics, QuickBite): Happy to. QuickBite operates 820 fast-casual locations. Our forecasting runs daily for next-day planning and intra-day refreshes. Primary data comes from our POS systems — Toast in 680 locations and legacy NCR Aloha in the remaining older stores. Sales transactions are pushed every 15 minutes via APIs into our central platform.
We also ingest loyalty program data from our mobile app, third-party delivery orders from DoorDash, Uber Eats, and Grubhub APIs, real-time inventory from Oracle NetSuite ERP, and external signals like weather from Weather Underground and local event calendars. All of this lands in Snowflake using Fivetran connectors. We maintain a feature store in Databricks Unity Catalog.
[03:45] Alex Rivera (xAI): Great overview. Can you take me through the actual forecasting models and how external sentiment currently plays a role?
[04:30] Marcus Lee: Our models run in Databricks. We use Prophet for baseline time-series forecasting, custom LSTM ensembles, and XGBoost for promotional effects. The pipeline is orchestrated with Apache Airflow on Google Kubernetes Engine. Nightly batch jobs produce next-day forecasts, with intra-day refreshes every four hours.
For social sentiment, we use Brandwatch for structured listening and limited raw X API v2 pulls. We apply basic VADER sentiment plus a fine-tuned BERT model. The data is extremely noisy, has 4–18 hour latency, and lacks reliable store-level or hyper-local granularity. We only get usable national signals during big campaigns.
[07:55] Alex Rivera (xAI): Understood on the current limitations. How does the processed sentiment data flow into your forecasting and downstream operations?
[08:40] Marcus Lee: Sentiment features are joined in our feature store and fed as exogenous variables into the forecasting models. Adjusted forecasts then flow into NetSuite for automated purchase orders, UKG Dimensions for labor scheduling, and our supply chain optimization tools. When sentiment signals are weak or delayed, we see 8–12% food waste in perishable categories and occasional stockouts during local viral events. The full pipeline processes about 2.8 TB of transactional data daily plus external signals.
[12:20] Alex Rivera (xAI): Can you walk me through the ETL/ELT architecture in more detail — tools, frequency, transformations, and error handling?
[13:10] Marcus Lee: We use Fivetran for extraction, dbt Cloud for transformations, and Spark jobs for heavy lifting. Airflow DAGs include ingestion, cleansing, feature engineering, model inference, and output distribution. We have extensive data quality checks using Great Expectations and automated alerts via PagerDuty. However, X data integration remains batch-only and requires significant manual cleaning due to spam and sarcasm issues.
[16:40] Alex Rivera (xAI): How do different locations or regions vary in their forecasting needs, and what external events have caused the biggest forecasting misses recently?
[17:35] Marcus Lee: Urban vs suburban locations have very different patterns. We also see massive swings around sports events, concerts, and weather events. Last summer, we missed a major local sentiment surge around a viral TikTok challenge that X picked up first, leading to $380k in lost revenue and excess waste across 47 stores.
[21:10] Alex Rivera (xAI): What does your current monitoring, model governance, and A/B testing process look like?
[22:00] Marcus Lee: We use MLflow for model registry and experiment tracking. Databricks Model Serving handles inference. We run weekly forecast accuracy reviews (current MAPE is 11.4% overall). Governance is handled by a cross-functional team of 14 data scientists, 6 analysts, and 3 ML engineers.
[25:30] Alex Rivera (xAI): Can you share the overall cost and resource picture for these forecasting operations?
[26:20] Marcus Lee: The entire data and analytics platform costs us roughly $9.2 million annually, including cloud spend, licensing, and headcount. We still struggle with signal quality from X despite spending on Brandwatch and third-party aggregators.
[30:15] Alex Rivera (xAI): Marcus, I've mapped out your full end-to-end process — POS and delivery API ingestion, Fivetran + Snowflake + Databricks pipeline, Prophet/LSTM/XGBoost models, current weak X sentiment integration, and the downstream impacts on waste and revenue. xAI can deliver real-time, high-signal Grok-powered sentiment and trend analysis directly from X data. Would you be open to a data feed review and a backtesting POC against your historical forecasts?
[33:40] Marcus Lee: Absolutely. Let's set that up.`,
  },
  {
    id: "example3",
    title: "LegacyCorp — Modernizing Workflows",
    description: "Legacy back-office modernization",
    content: `LegacyCorp – Modernizing Legacy Back-Office Workflows
Discovery Call Recording
Simulated Date: March 2026
Duration: ~51 minutes
Participants: Alex Rivera (Senior Enterprise Sales Engineer, xAI) and Priya Patel (CIO, LegacyCorp)
[00:00] Alex Rivera (xAI): Hi Priya, Alex Rivera from xAI. Thank you for the time. Could you start with an overview of your current back-office operations and the legacy systems supporting invoicing, procurement, HR, and compliance at LegacyCorp?
[00:55] Priya Patel (CIO, LegacyCorp): Certainly. LegacyCorp is a large manufacturing and specialty insurance organization with decades of technical debt. Our core back-office systems run on IBM z/OS mainframe using COBOL and CICS applications with DB2 databases. The ERP layer is still SAP ECC 6.0 (we have not yet migrated to S/4HANA). We process accounts payable/receivable, procurement, HR onboarding/payroll, and insurance claims through this environment.
Most processes remain batch-oriented. Nightly JCL jobs and Informatica PowerCenter ETLs move data between mainframe and our Oracle data warehouse. We use heavy file-based transfers via SFTP and some custom APIs layered on over the years. We've added UiPath RPA bots to 45 processes to reduce manual Excel and email work, but they are fragile and require constant maintenance.
[04:10] Alex Rivera (xAI): Helpful context. Could you walk me through a complete end-to-end example — say, invoice processing — including upstream sources and downstream impacts?
[05:05] Priya Patel: Invoice processing starts with vendors sending PDFs via email or EDI 810 transactions. Files land in a staging server, go through ABBYY FlexiCapture OCR, then either manual validation or UiPath bots push data into the mainframe COBOL matching programs against purchase orders stored in SAP ECC. Approved invoices trigger nightly batch payment runs via banking integration. Downstream, data flows to financial reporting in Tableau, audit archives, and our Oracle data warehouse. The full cycle averages 3–5 business days. We have 18 full-time staff just in reconciliation. Annual mainframe MIPS costs exceed $4.1 million.
[09:20] Alex Rivera (xAI): How are these workflows orchestrated today, and what are the biggest integration and reliability challenges?
[10:10] Priya Patel: Orchestration is primarily scheduled batch with limited event-driven triggers via IBM MQ. Integrations are mostly point-to-point file drops and custom middleware. We experience frequent failures during peak periods (month-end, quarter-close) requiring manual intervention. Error rates on RPA bots average 8.4% and require dedicated maintenance teams.
[13:40] Alex Rivera (xAI): Can you describe the team structures, handoffs, and organizational processes supporting these systems?
[14:30] Priya Patel: We have a mainframe COBOL team of 22 developers (average age 57), an SAP basis and functional team of 18, an RPA Center of Excellence with 9 people, and integration specialists. Handoffs between finance, procurement, HR, and IT create significant delays. Knowledge transfer is becoming critical as senior staff approach retirement.
[18:05] Alex Rivera (xAI): What compliance and governance requirements are most burdensome in these processes?
[18:55] Priya Patel: SOX, GDPR for HR data, and industry-specific insurance regulations require immutable audit logs, strict change control, and extensive documentation. Every modification to mainframe programs or SAP configurations goes through 6-week testing cycles. Data residency and encryption requirements further complicate modernization.
[22:30] Alex Rivera (xAI): How have previous modernization or automation attempts gone, and what were the main obstacles?
[23:20] Priya Patel: We attempted a large SAP S/4HANA migration in 2023 that was paused due to risk and cost. RPA expansion has plateaued because bots break whenever SAP screens or mainframe green screens change. Custom microservices on Azure have helped some peripheral processes but can't touch the core transactional systems safely.
[27:40] Alex Rivera (xAI): What monitoring, alerting, and disaster recovery processes exist for these legacy systems?
[28:30] Priya Patel: We use IBM Tivoli and some modern overlays like Splunk for logging. Disaster recovery involves weekly mainframe backups and a hot site. Alerting is still largely manual during batch windows. Scaling is impossible without significant hardware upgrades.
[32:10] Alex Rivera (xAI): Can you give me a sense of the total annual cost and pain associated with maintaining these legacy workflows?
[33:00] Priya Patel: Combined mainframe, SAP, and RPA maintenance exceeds $28 million annually, plus the opportunity cost of slow cycle times impacting cash flow and employee experience. Talent acquisition for COBOL and ECC skills has become extremely expensive.
[37:20] Alex Rivera (xAI): Priya, I now have a very clear and detailed map of your current environment — the mainframe COBOL/DB2 core, SAP ECC batch processes, Informatica ETL, UiPath RPA layer, file-based integrations, heavy compliance overhead, high maintenance costs, and critical talent risks. xAI's agentic AI capabilities are designed to securely orchestrate and modernize exactly these legacy-to-modern transitions with tool calling across systems while maintaining auditability. Would you be open to a deep-dive architecture review and a small proof-of-concept on one of your highest-pain processes like invoice matching or procurement?
[41:15] Priya Patel: Yes. This is worth exploring. Let's schedule the workshop.`,
  },
];

interface ExamplesDrawerProps {
  onInsert?: (content: string) => void;
}

export default function ExamplesDrawer({ onInsert }: ExamplesDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExample, setActiveExample] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleInsert = (content: string) => {
    if (onInsert) {
      onInsert(content);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating tab/handle on the left edge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 bg-surface border border-border border-l-0 rounded-r-lg px-2 py-3 text-muted hover:text-foreground hover:bg-surface-hover transition-all shadow-lg"
          title="Open example scripts"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="text-xs font-medium tracking-widest" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>EXAMPLES</span>
        </button>
      )}

      {/* Drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-50 w-96 bg-surface border-r border-border shadow-2xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-semibold text-sm">Example Scripts</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Example tabs */}
          <div className="flex border-b border-border">
            {EXAMPLES.map((example, index) => (
              <button
                key={example.id}
                onClick={() => setActiveExample(index)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activeExample === index
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Active example content */}
          <div className="flex-1 overflow-auto p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-1">
                {EXAMPLES[activeExample].title}
              </h3>
              <p className="text-xs text-muted">
                {EXAMPLES[activeExample].description}
              </p>
            </div>

            <div className="bg-background border border-border rounded-lg p-3 mb-4 max-h-[400px] overflow-auto">
              <pre className="text-[10px] font-mono text-muted whitespace-pre-wrap leading-snug">
                {EXAMPLES[activeExample].content.slice(0, 1200)}
                {EXAMPLES[activeExample].content.length > 1200 && "..."}
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  copyToClipboard(EXAMPLES[activeExample].content, activeExample)
                }
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border hover:border-border-hover text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                {copiedIndex === activeExample ? (
                  <>
                    <Check className="w-4 h-4 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>

              {onInsert && (
                <button
                  onClick={() => handleInsert(EXAMPLES[activeExample].content)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover text-sm transition-colors"
                >
                  Use This Script
                </button>
              )}
            </div>

            <p className="text-[10px] text-muted mt-3 text-center">
              Full transcript ~{Math.round(EXAMPLES[activeExample].content.length / 1000)}k characters
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
