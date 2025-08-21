import { useMantle } from "@heymantle/react";
import { useEffect } from 'react';

export default function () {
  const { createHostedSession } = useMantle();
  useEffect(() => {
    (async () => {
      const session = await createHostedSession({ type: 'account' });
      open(session.url, "_self");
    })();
  }, []);
  return '';
}
