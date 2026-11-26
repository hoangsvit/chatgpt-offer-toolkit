import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from './collapsible';
import { translate } from '../i18n';

const OPEN_CHECKOUT = 'offer-toolkit-open-checkout';
type CardId = 'checkout-preferences' | 'update-center';

function CardBody({ content }: { content: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    host.current?.append(content);
    content.hidden = false;
  }, [content]);
  return <div ref={host}/>;
}

function SettingsCards({ checkout, updates }: { checkout: HTMLElement; updates: HTMLElement }) {
  const [active,setActive] = useState<CardId | null>('checkout-preferences');
  useLayoutEffect(() => {
    const openCheckout = () => setActive('checkout-preferences');
    document.addEventListener(OPEN_CHECKOUT,openCheckout);
    return () => document.removeEventListener(OPEN_CHECKOUT,openCheckout);
  }, []);

  return ([
    {id:'checkout-preferences',title:'Checkout defaults',content:checkout},
    {id:'update-center',title:'Software updates',content:updates},
  ] as const).map(({id,title,content}) => (
    <Collapsible key={id} id={id} className="advanced settings-card"
      open={active===id} onOpenChange={open=>setActive(open?id:null)}>
      <CollapsibleTrigger className="settings-trigger-row">
        <span>{translate(title)}{id==='update-center' && <span id="update-dot" hidden> · {translate('New')}</span>}</span>
        <CollapsibleIndicator className="size-4"/>
      </CollapsibleTrigger>
      <CollapsibleContent className="settings-card-panel" contentClassName="pt-2">
        <CardBody content={content}/>
      </CollapsibleContent>
    </Collapsible>
  ));
}

export function mountSettingsCards() {
  const host = document.getElementById('settings-cards')!;
  const checkout = document.getElementById('settings')!;
  const updates = document.getElementById('settings-update-content')!;
  flushSync(() => createRoot(host).render(<SettingsCards checkout={checkout} updates={updates}/>));
}

export function openCheckoutPreferences() {
  flushSync(() => document.dispatchEvent(new Event(OPEN_CHECKOUT)));
}
