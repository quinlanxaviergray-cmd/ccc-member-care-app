import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CARE_TYPE_LABELS: Record<string, string> = {
  short_term_medical: 'Short-Term Medical',
  long_term_medical: 'Long-Term Medical',
  grief: 'Grief',
  pregnancy: 'Pregnancy',
  homebound: 'Homebound',
  other: 'Other',
}

function isNeedsAttention(card: any): boolean {
  if (card.status === 'completed') return false
  if (!card.last_interaction_at) return true

  const last = new Date(card.last_interaction_at)
  const now = new Date()
  const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)

  if (card.follow_up_interval === 'daily') return diff >= 1
  if (card.follow_up_interval === 'weekly') return diff >= 7
  if (card.follow_up_interval === 'monthly') return diff >= 30

  return false
}

function formatDate(date: string | null): string {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatInterval(interval: string): string {
  if (interval === 'daily') return 'Daily'
  if (interval === 'weekly') return 'Weekly'
  if (interval === 'monthly') return 'Monthly'
  return interval
}

function buildEmailHtml(cards: any[], today: string): string {
  const hasCards = cards.length > 0

  const cardRows = hasCards
    ? cards
        .map(
          (card) => `
        <tr>
          <td style="padding: 0 0 20px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="
              background: #ffffff;
              border-radius: 12px;
              border: 1px solid #e2e8e4;
              overflow: hidden;
            ">
              <tr>
                <td style="
                  background: #4f6b57;
                  padding: 4px 16px;
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 12px;
                  font-weight: 700;
                  color: #ffffff;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                ">
                  ${CARE_TYPE_LABELS[card.care_type] || 'Other'}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <p style="
                          margin: 0 0 4px 0;
                          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                          font-size: 20px;
                          font-weight: 800;
                          color: #1f2937;
                        ">${card.name}</p>
                        <p style="
                          margin: 0 0 16px 0;
                          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                          font-size: 15px;
                          font-weight: 600;
                          color: #4f6b57;
                        ">${card.care_title}</p>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <table cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #e2e8e4; padding-top: 14px;">
                          <tr>
                            <td style="
                              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                              font-size: 13px;
                              color: #6b7280;
                              padding-top: 14px;
                            ">
                              📍 ${card.location || 'No location'}&nbsp;&nbsp;
                              📞 ${card.phone || 'No phone'}&nbsp;&nbsp;
                              🔁 ${formatInterval(card.follow_up_interval)}
                            </td>
                            <td align="right" style="
                              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                              font-size: 13px;
                              font-weight: 600;
                              color: #dc2626;
                              padding-top: 14px;
                              white-space: nowrap;
                            ">
                              ⏰ Last contact: ${formatDate(card.last_interaction_at)}
                            </td>
                          </tr>
                          ${card.notes ? `
                          <tr>
                            <td colspan="2" style="
                              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                              font-size: 13px;
                              color: #6b7280;
                              padding-top: 10px;
                              font-style: italic;
                            ">
                              📝 ${card.notes}
                            </td>
                          </tr>` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
        )
        .join('')
    : `
      <tr>
        <td style="padding: 20px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="
            background: #f0f7f1;
            border-radius: 12px;
            border: 1px solid #c4d4c7;
            padding: 40px 24px;
            text-align: center;
          ">
            <tr>
              <td style="text-align: center; padding: 40px 24px;">
                <p style="
                  margin: 0 0 8px 0;
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 32px;
                ">✅</p>
                <p style="
                  margin: 0 0 4px 0;
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 18px;
                  font-weight: 700;
                  color: #2d6a35;
                ">All caught up!</p>
                <p style="
                  margin: 0;
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 14px;
                  color: #4f6b57;
                ">No members need attention today.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #f4f7f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f7f2; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">

          <!-- HEADER -->
          <tr>
            <td style="
              background: #2d4a33;
              border-radius: 16px 16px 0 0;
              padding: 32px 32px 28px;
            ">
              <p style="
                margin: 0 0 6px 0;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 22px;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.3px;
              ">Member Care</p>
              <p style="
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                color: #a8c4ab;
              ">Daily Digest — ${today}</p>
            </td>
          </tr>

          <!-- SUMMARY BAR -->
          <tr>
            <td style="
              background: ${hasCards ? '#dc2626' : '#4f6b57'};
              padding: 14px 32px;
            ">
              <p style="
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                font-weight: 700;
                color: #ffffff;
              ">
                ${hasCards
                  ? `⏰ ${cards.length} member${cards.length === 1 ? '' : 's'} need${cards.length === 1 ? 's' : ''} attention`
                  : '✅ All members are up to date'}
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="
              background: #f9fbf7;
              padding: 28px 24px 8px;
              border-radius: 0 0 16px 16px;
              border: 1px solid #d9e2d6;
              border-top: none;
            ">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${cardRows}
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p style="
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                color: #9ca3af;
              ">This is an automated daily summary from your Member Care app.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch all active cards
    const { data: cardsData, error: cardsError } = await supabase
      .from('care_cards')
      .select('*')
      .neq('status', 'completed')

    if (cardsError) throw cardsError

    // Fetch latest interaction per card
    let latestInteractions: Record<string, string> = {}
    if (cardsData && cardsData.length > 0) {
      const cardIds = cardsData.map((c: any) => c.id)
      const { data: interactions, error: intError } = await supabase
        .from('interactions')
        .select('care_card_id, interacted_at')
        .in('care_card_id', cardIds)
        .order('interacted_at', { ascending: false })

      if (intError) throw intError

      interactions?.forEach((i: any) => {
        if (!latestInteractions[i.care_card_id]) {
          latestInteractions[i.care_card_id] = i.interacted_at
        }
      })
    }

    // Attach last_interaction_at and filter to needs-attention
    const allCards = (cardsData || []).map((card: any) => ({
      ...card,
      last_interaction_at: latestInteractions[card.id] || null,
    }))

    const attentionCards = allCards.filter(isNeedsAttention)

    // Format today's date
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    // Build email
    const html = buildEmailHtml(attentionCards, today)
    const subject = attentionCards.length > 0
      ? `⏰ ${attentionCards.length} Member${attentionCards.length === 1 ? '' : 's'} Need Attention — ${today}`
      : `✅ All Caught Up — Member Care Digest for ${today}`

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Member Care <onboarding@resend.dev>',
        to: [Deno.env.get('DIGEST_EMAIL')!],
        subject,
        html,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      throw new Error(`Resend error: ${err}`)
    }

    return new Response(JSON.stringify({ success: true, cardCount: attentionCards.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
