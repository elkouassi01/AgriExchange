// src/hooks/useCallingCodes.js
import { useState, useEffect } from 'react';

// Hook pour récupérer les indicatifs téléphoniques avec drapeaux
const useCallingCodes = () => {
  const [callingCodes, setCallingCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCallingCodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=idd,name,flags');
        if (!res.ok) throw new Error('Impossible de récupérer les données');
        const data = await res.json();

        // Construire la liste avec indicatif + drapeau + pays
        const codes = [];
        data.forEach((country) => {
          const iddRoot = country.idd?.root || '';
          const iddSuffixes = country.idd?.suffixes || [];

          if (iddRoot && iddSuffixes.length > 0) {
            iddSuffixes.forEach((suffix) => {
              const code = `${iddRoot}${suffix}`;
              codes.push({
                code,
                label: `${code} (${country.name.common})`,
                drapeau: country.flags?.png || '', // url du drapeau
                value: code,
              });
            });
          }
        });

        // Supprimer les doublons par code
        const uniqueCodes = Array.from(
          new Map(codes.map((item) => [item.code, item])).values()
        );

        // Trier par code croissant
        uniqueCodes.sort((a, b) => {
          const numA = parseInt(a.code.replace('+', ''), 10);
          const numB = parseInt(b.code.replace('+', ''), 10);
          return numA - numB;
        });

        setCallingCodes(uniqueCodes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCallingCodes();
  }, []);

  return { callingCodes, loading, error };
};

export default useCallingCodes;
