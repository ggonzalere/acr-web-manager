﻿using System;

namespace WebManager.Services
{
    public class ProgramOptions
    {
        public Uri LoginRedirectEndpoint { get; set; }
        public Uri ManagementEndpoint { get; set; }
        public string ManagementResource { get; set; }

        public string ClientId { get; set; }
        public string ClientSecret { get; set; }
        public string Tenant { get; set; }

        public string Authority { get; set; }
    }
}