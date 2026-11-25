export type PriceReview = {state:'zero'|'paid'|'unknown'; amount:string|null; reason:string};

// Serialized into the active tab by the user's popup action. No network calls,
// no page writes, no reading form fields, payment credentials or checkout IDs.
export function reviewCheckoutPrice(): PriceReview {
  const unknown = (reason:string): PriceReview => ({state:'unknown',amount:null,reason});
  if (location.origin !== 'https://pay.openai.com' &&
      location.origin !== 'https://checkout.stripe.com' &&
      !(location.origin === 'https://chatgpt.com' && /^\/(checkout|payments\/checkout)(\/|$)/.test(location.pathname))) {
    return unknown('Open the official ChatGPT checkout first.');
  }
  const clean = (text:string) => text.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
  function visible(el: Element): boolean {
    if (el.closest('input,textarea,select,script,style,template,[hidden],[aria-hidden="true"],[contenteditable="true"]')) return false;
    const style = getComputedStyle(el);
    return style.visibility === 'visible' && style.display !== 'none' && el.getClientRects().length > 0;
  }
  // Only explicit due-now labels; never infer from subtotal, discount, renewal or trial text.
  const labels = /^(total due today|total due now|amount due today|amount due now|due today|due now|tổng thanh toán hôm nay|tổng tiền đến hạn hôm nay|số tiền phải trả hôm nay|phải trả hôm nay)\s*:?$/i;
  // Exact numeric amount with explicit ISO code or VND marker. Currency symbols
  // are retained as displayed (a bare $ is not assumed to mean USD).
  function parse(value:string): {amount:string;zero:boolean}|null {
    const text=clean(value);
    const m=text.match(/^(?:([A-Z]{3}|₫|đ|\$|€|£|¥)\s*)?([0-9]+(?:[., ][0-9]+)*)(?:\s*([A-Z]{3}|₫|đ|\$|€|£|¥))?$/iu);
    if (!m || (!m[1] && !m[3]) || (m[1] && m[3])) return null;
    const digits=m[2]?.replace(/[^0-9]/g,'') ?? '';
    if (!digits || digits.length > 18) return null;
    return {amount:text,zero:/^0+$/.test(digits)};
  }
  // Stripe is a multi-merchant site. Require a visible product label for ChatGPT Business
  // before reporting a result; other merchant pages always remain unknown.
  const elements=Array.from(document.querySelectorAll('span,div,p,dt,dd,strong,b,label,h1,h2,h3'));
  const leaves=elements.filter(el=>el.childElementCount===0 && visible(el));
  if (location.origin === 'https://checkout.stripe.com' && !leaves.some(el=>/^(ChatGPT Business|ChatGPT Team)(\s*[-–:]\s*(Standard|Monthly|Subscription))?$/i.test(clean(el.textContent ?? '')))) {
    return unknown('The current Stripe checkout could not be identified as ChatGPT Business.');
  }
  const amounts: {amount:string;zero:boolean}[] = [];
  let foundLabel=false;
  for (const label of leaves) {
    if (!labels.test(clean(label.textContent ?? ''))) continue;
    foundLabel=true;
    // Read only a nearby explicit label/value pair, never the entire page.
    let row: Element | null=label;
    for(let level=0;level<3 && row;level++,row=row.parentElement) {
      const next=row.nextElementSibling;
      if (!next || !visible(next) || next.querySelector('input,textarea,select,[contenteditable]')) continue;
      const amount=parse(next.textContent ?? '');
      if(amount) {amounts.push(amount);break;}
    }
  }
  if (!amounts.length) return unknown(foundLabel?'Due-today amount is not readable yet. Review the official checkout.':'No explicit due-today total found. Review the official checkout.');
  if (amounts.some(a=>a.amount!==amounts[0]?.amount)) return unknown('Conflicting due-today totals. Review the official checkout.');
  const amount=amounts[0]!;
  return {state:amount.zero?'zero':'paid',amount:amount.amount,reason:amount.zero?'Displayed due today is zero. Verify renewal price, seat coverage, discount duration and terms before subscribing.':'The displayed due-today total is nonzero. Review all charges before subscribing.'};
}
