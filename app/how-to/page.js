"use client"

import { useRouter } from 'next/navigation'

const SITE_FONT = "'Avenir Next', Avenir, Helvetica, Arial, sans-serif"

export default function HowTo() {
  const router = useRouter()

  const sectionStyle = {
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid #d9e2d6',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    backdropFilter: 'blur(12px)',
    marginBottom: '1rem',
    fontFamily: SITE_FONT,
  }

  const headingStyle = {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#2f3a34',
    fontFamily: SITE_FONT,
  }

  const subheadingStyle = {
    margin: '1rem 0 0.4rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#4f6b57',
    fontFamily: SITE_FONT,
  }

  const textStyle = {
    fontSize: '0.95rem',
    color: '#374151',
    lineHeight: '1.7',
    fontFamily: SITE_FONT,
    margin: '0 0 0.5rem',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 45%, #f9fbf7 100%)', fontFamily: SITE_FONT, padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ ...sectionStyle, textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', fontFamily: SITE_FONT }}>BurdenBear</h1>
          <div style={{ color: '#5f6b63', marginTop: '0.25rem', fontSize: '0.95rem', fontFamily: SITE_FONT }}>How-To Guide</div>
        </div>

        <button
          onClick={() => router.push('/')}
          style={{ padding: '0.5rem 1rem', background: '#6f8f73', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', fontFamily: SITE_FONT, marginBottom: '1.5rem' }}
        >
          ← Back to Dashboard
        </button>

        {/* Overview */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>What is BurdenBear?</h2>
          <p style={textStyle}>
            BurdenBear is a Member Care tracking tool designed to help your team stay on top of pastoral care. It allows you to create Care Cards for individuals who need regular follow-up, log interactions, and make sure no one falls through the cracks.
          </p>
        </div>

        {/* Care Cards */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Care Cards</h2>
          <p style={textStyle}>
            A Care Card represents a person in your congregation who needs ongoing care and follow-up. Each card tracks who they are, what kind of care they need, how often they should be contacted, and a history of every interaction your team has had with them.
          </p>

          <p style={subheadingStyle}>Creating a Care Card</p>
          <p style={textStyle}>
            Tap the green <strong>+</strong> button in the bottom right corner of the dashboard to create a new Care Card. You'll be asked to fill in the person's name, phone number, location, care type, follow-up frequency, and any relevant notes.
          </p>

          <p style={subheadingStyle}>Care Types</p>
          <p style={textStyle}>Choose the category that best describes the person's situation:</p>
          <ul style={{ ...textStyle, paddingLeft: '1.25rem' }}>
            <li><strong>Short-Term Medical</strong> — Someone recovering from a surgery, illness, or temporary medical situation.</li>
            <li><strong>Long-Term Medical</strong> — Someone managing a chronic illness or ongoing medical condition.</li>
            <li><strong>Grief</strong> — Someone who has experienced a loss and needs ongoing emotional and spiritual support.</li>
            <li><strong>Pregnancy</strong> — Someone who is expecting or has recently had a baby and could use extra care and encouragement.</li>
            <li><strong>Homebound</strong> — Someone who is unable to leave their home and needs regular in-person or phone support.</li>
            <li><strong>On Our Radar</strong> — Someone your team wants to keep an eye on who doesn't yet need active follow-up. These cards do not appear in the This Week tab.</li>
            <li><strong>Other</strong> — Any situation that doesn't fit neatly into the categories above.</li>
          </ul>

          <p style={subheadingStyle}>Follow-Up Frequency</p>
          <p style={textStyle}>Set how often this person should be contacted:</p>
          <ul style={{ ...textStyle, paddingLeft: '1.25rem' }}>
            <li><strong>Daily</strong> — This person needs to be contacted every day. They will appear on the Today tab each morning.</li>
            <li><strong>Weekly</strong> — This person needs to be contacted once a week. They will appear on the This Week tab as their due date approaches.</li>
            <li><strong>Monthly</strong> — This person needs to be contacted once a month.</li>
          </ul>

          <p style={subheadingStyle}>Editing a Care Card</p>
          <p style={textStyle}>
            Open any Care Card by tapping on it, then tap the <strong>Edit</strong> button to update any of the card's details.
          </p>

          <p style={subheadingStyle}>Completing a Care Card</p>
          <p style={textStyle}>
            When someone no longer needs active care, open their card and tap <strong>Click to Complete</strong>. The card will move to the Completed tab. If a card is completed by mistake, open it and tap <strong>Make Active</strong> to restore it.
          </p>
        </div>

        {/* Tabs */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Dashboard Tabs</h2>

          <p style={subheadingStyle}>All Cards</p>
          <p style={textStyle}>
            The default view. Browse all active Care Cards and use the dropdown to filter by care type — Grief, Short-Term Medical, Long-Term Medical, Pregnancy, Homebound, Prayer, or Other.
          </p>

          <p style={subheadingStyle}>This Week</p>
          <p style={textStyle}>
            Shows every Care Card whose next interaction is due between Monday at 12:01 AM and the following Monday at 12:00 AM. This tab resets automatically each Monday morning, making it the best place to start your week and plan who needs to be contacted. Prayer cards are excluded from this tab and should be managed separately.
          </p>
          <p style={textStyle}>
            When viewing This Week, use the <strong>Staff</strong> and <strong>Care Team</strong> filter buttons that appear below the tabs to narrow the list by who the card is assigned to. These filters are toggles — tap one to activate it, tap again to show all.
          </p>

          <p style={subheadingStyle}>Completed</p>
          <p style={textStyle}>
            A record of all Care Cards that have been marked as complete. These cards are no longer active but remain in the system for reference. You can reactivate a completed card at any time by opening it and tapping <strong>Make Active</strong>.
          </p>
        </div>

        {/* Logging Interactions */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Logging Interactions</h2>
          <p style={textStyle}>
            Every time someone on your team contacts a person, that interaction should be logged. Open the Care Card and scroll to the bottom to find the interaction form. Choose the type of interaction and add any notes about how the conversation went.
          </p>

          <p style={subheadingStyle}>Interaction Types</p>
          <ul style={{ ...textStyle, paddingLeft: '1.25rem' }}>
            <li><strong>Phone Call</strong> — A phone or video call with the person.</li>
            <li><strong>Visit</strong> — An in-person visit at their home, hospital, or elsewhere.</li>
            <li><strong>Text</strong> — A text message exchange.</li>
            <li><strong>Email</strong> — An email sent to the person.</li>
          </ul>

          <p style={textStyle}>
            Logging an interaction resets the follow-up timer for that card, so the Next Interaction Needed By date will update automatically based on the card's frequency.
          </p>
        </div>

        {/* Tips */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>Tips for Your Team</h2>
          <ul style={{ ...textStyle, paddingLeft: '1.25rem' }}>
            <li>Check the <strong>This Week</strong> tab every Monday morning to plan your week of care visits and calls.</li>
            <li>Use the <strong>Staff</strong> and <strong>Care Team</strong> filter buttons on the This Week tab to divide up responsibilities for the week.</li>
            <li>Always log an interaction immediately after contacting someone so the rest of the team knows it's been done.</li>
            <li>Use the Notes field on Care Cards to record important context — like family situations, prayer requests, or specific needs.</li>
            <li>On Our Radar cards won't appear in This Week — check All Cards and filter by On Our Radar to keep tabs on people who may need more active care soon.</li>
            <li>If you're unsure which care type to use, choose the one that best describes the primary reason the person needs care right now.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}