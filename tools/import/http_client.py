"""Small dependency-free HTTPS client with timeout, retries and host allowlisting."""

from __future__ import annotations

import json
import random
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class ImportNetworkError(RuntimeError):
    pass


def fetch_json(
    url: str,
    *,
    allowed_hosts: set[str],
    timeout: float = 20.0,
    retries: int = 2,
) -> object:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in allowed_hosts:
        raise ValueError("Only allowlisted HTTPS sources may be fetched")
    headers = {
        "Accept": "application/json",
        "User-Agent": "Jame-al-Tafasir-Mansour-importer/1.0 (provenance-preserving)",
    }
    last_error: Exception | None = None
    for attempt in range(retries + 1):
        try:
            with urlopen(Request(url, headers=headers), timeout=timeout) as response:
                if response.status != 200:
                    raise ImportNetworkError(f"Unexpected HTTP status: {response.status}")
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
            last_error = error
            retryable = not isinstance(error, HTTPError) or error.code in {408, 429} or error.code >= 500
            if attempt >= retries or not retryable:
                break
            time.sleep((0.5 * (2**attempt)) + random.uniform(0, 0.2))
    raise ImportNetworkError(f"Could not fetch {url}: {last_error}") from last_error

