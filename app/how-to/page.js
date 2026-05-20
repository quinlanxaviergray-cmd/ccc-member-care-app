"use client"

import { useRouter } from 'next/navigation'

const SITE_FONT = 'Avenir Next, Avenir, Helvetica, Arial, sans-serif'

const sections = [
  {
    emoji: '📋',
    title: 'The Monday Morning Workflow',
    content: `BurdenBear is built around your Monday rhythm. Here is how to use it:

1. Open the app before your Member Care Team meeting.
2. Review all cards — check the Staff and Care Team tabs to make sure everything is up to date and assigned.
3. Any new cards from Sunday that are unassigned? Assign them now.
4. Go to the Admin Panel (hamburger menu, then Admin Panel) and select the On-Call Pastor for the week.
5. Walk into staff meeting. Review the On-Call pastor's cards. Ask if any staff want to take one or two based on personal relationship.
6. Reassign those cards to the staff member who volunteers.

Everyone opens the app, sees their Me tab, and knows exactly who they are responsible for.`,
  },
  {
    emoji: '🗂️',
    title: 'The Three Tabs',
    content: `The app has three primary tabs:

Me — Shows every card assigned specifically to you. This is your personal list. Open the app here first.

Staff — Shows all cards assigned to anyone with a Staff role (pastors, paid staff). Everyone can see this.

Care Team — Shows all cards assigned to anyone with a Care Team role (volunteer caregivers).

You can also use the dropdown to browse All Cards, filter by care type, or view Completed cards.`,
  },
  {
    emoji: '👤',
    title: 'Assigning a Care Card',
    content: `When creating or editing a card, use the Assigned To dropdown to choose a person. The list pulls from everyone in the app.

Assigning someone does two things:
1. The card shows up on that person's Me tab — they know it is theirs.
2. It shows up on the Staff or Care Team tab based on their role.

You can also assign a card to On Call. That card will automatically route to whoever the Admin has set as on-call for the week. When the on-call pastor changes, all On Call cards shift to the new person automatically.

Leaving a card unassigned means it will not appear on anyone's Me tab — a good signal it needs attention during your Monday review.`,
  },
  {
    emoji: '📞',
    title: 'Setting the On-Call Pastor',
    content: `Each week, an Admin selects the On-Call Pastor from the Admin Panel.

To do this:
1. Open the hamburger menu (top right), then tap Admin Panel.
2. Under On-Call Pastor This Week, select a person from the dropdown.
3. Click Set On Call.

The selected person's name will appear at the top of the app so everyone knows who is on call. Any cards assigned to On Call will appear on that person's Me tab for the week.`,
  },
  {
    emoji: '✍️',
    title: 'Logging an Interaction',
    content: `Click any care card, then scroll to Add Interaction at the bottom.

Fill in:
- Type (Visit, Phone Call, Text, Email, Update, Other)
- Date and time of the interaction
- Notes about how it went
- Next Interaction Needed By — pick the date you want to follow up by

That last field is the important one. When you set it, the app automatically calculates and saves the follow-up schedule in the background. Just pick the next date that makes sense for this person.

The card will update to show when the next interaction is due and will turn red if it becomes overdue.`,
  },
  {
    emoji: '✅',
    title: 'Completing a Card',
    content: `When someone's care need has resolved — they have recovered, grief has stabilized, or the situation is closed — mark the card complete.

Open the card and click Mark Complete. It moves to the Completed tab and is removed from active views. You can always reactivate it if circumstances change.`,
  },
  {
    emoji: '🔴',
    title: 'Understanding Overdue Cards',
    content: `A card turns red when the next interaction date has passed and no interaction has been logged.

If a card is overdue on your Me tab, that person needs to hear from you. Log an interaction as soon as you reach out — even a quick text counts. Set the next date when you log it.

On Our Radar cards (the prayer category) do not have due dates and will not turn red. They are passive-watch items.`,
  },
  {
    emoji: '🧭',
    title: 'Navigating Between Cards',
    content: `When a card is open, you will see arrow buttons at the top of the detail view. Use these to move through the current list of cards without closing and reopening the modal.

You can also use your keyboard: left and right arrow keys navigate between cards, and Escape closes the detail view.

This is especially useful during your Monday morning review — open the first card and arrow through them one by one.`,
  },
  {
    emoji: '⚙️',
    title: 'Admin: Managing Roles',
    content: `In the Admin Panel, you can set each person's role: Staff or Care Team.

Staff = Pastors and paid staff. Their assigned cards appear under the Staff tab.
Care Team = Volunteer caregivers. Their assigned cards appear under the Care Team tab.

You can also grant or remove Admin access from this panel. Admins can set roles and select the on-call person. Everyone else can see and interact with all cards.`,
  },
]

export default function HowTo() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4ee 0%, #f7f8f3 100%)', fontFamily: SITE_FONT, padding: '1.5rem 1rem 4rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => router.push('/')}
            style={{ background: 'white', border: '1px solid #cfd8cc', borderRadius: '0.75rem', padding: '0.6rem 1rem', cursor: 'pointer', fontFamily: SITE_FONT, fontWeight: '600', color: '#4f6b57', fontSize: '0.9rem' }}
          >
            Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', fontFamily: SITE_FONT }}>How to Use BurdenBear</h1>
        </div>

        <p style={{ color: '#5f6b63', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem', fontFamily: SITE_FONT }}>
          BurdenBear helps your church care for people well — not just track them. The goal is that every person with a care need has someone who knows they are responsible for them.
        </p>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {sections.map((section) => (
            <div
              key={section.title}
              style={{ background: 'white', border: '1px solid #d9e2d6', borderRadius: '1.25rem', padding: '1.5rem' }}
            >
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: '800', fontFamily: SITE_FONT }}>
                {section.emoji} {section.title}
              </h2>
              <div style={{ color: '#374151', fontSize: '0.95rem', lineHeight: '1.75', fontFamily: SITE_FONT, whiteSpace: 'pre-line' }}>
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', background: '#eef4ee', border: '1px solid #a8c4ab', borderRadius: '1.25rem', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#4f6b57', fontWeight: '600', fontSize: '0.95rem', fontFamily: SITE_FONT }}>
            "Bear one another's burdens, and so fulfill the law of Christ." — Galatians 6:2
          </p>
        </div>

      </div>
    </div>
  )
}